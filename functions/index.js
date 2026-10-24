const { onObjectFinalized } = require('firebase-functions/v2/storage')
const { defineSecret, defineString } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const Anthropic = require('@anthropic-ai/sdk')
// firebase-admin 14+ only has the modular API (no admin.firestore()).
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage')

initializeApp()
const db = getFirestore()

// API key from the Claude Console (platform.claude.com). API usage is billed
// separately from Claude.ai / Claude Code subscriptions.
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')
// Configurable so the model can be swapped without touching code — set it
// in functions/.env as EXTRACTION_MODEL=...
const EXTRACTION_MODEL = defineString('EXTRACTION_MODEL', { default: 'claude-opus-5' })

// Files are sent inline (base64). 14 MB keeps the request well under the
// API's 32 MB limit after base64's ~33% inflation, and matches the limit
// the client shows users (DocumentProcessing.jsx).
const MAX_FILE_BYTES = 14 * 1024 * 1024
const SUPPORTED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg'])

// Storage paths are self-describing, so this function never guesses which
// Firestore doc to update or which extraction to run. The client creates the
// doc (with processingStatus 'pending') BEFORE uploading, so the id exists.
// The doc lives in a root collection (conducts/{id}, exams/{id}); the
// patient uid in the path must match the doc's patientId.
//   users/{patientUid}/conducts/{conductId}/prescription-{file} -> medication list
//   users/{patientUid}/exams/{examId}/request-{file}            -> requested exams
//   users/{patientUid}/exams/{examId}/result-{file}             -> lab values -> biomarkers
const ROUTES = [
  { kind: 'prescription', re: /^users\/([^/]+)\/conducts\/([^/]+)\/prescription-/, collection: 'conducts' },
  { kind: 'examRequest', re: /^users\/([^/]+)\/exams\/([^/]+)\/request-/, collection: 'exams' },
  { kind: 'examResult', re: /^users\/([^/]+)\/exams\/([^/]+)\/result-/, collection: 'exams' },
]

// ---------------------------------------------------------------------------
// Extraction schemas. Claude's structured outputs (output_config.format)
// guarantee the reply is JSON in exactly this shape — no free-text parsing,
// no stripping of ``` fences. Every object needs additionalProperties: false.
// ---------------------------------------------------------------------------

const MEDICATIONS_SCHEMA = {
  type: 'object',
  properties: {
    medications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome do medicamento, como escrito na receita' },
          dosage: { type: 'string', description: 'Dose/concentração, ex: "20 mg"' },
          instructions: { type: 'string', description: 'Posologia e orientações, ex: "1 comprimido à noite"' },
        },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
  required: ['medications'],
  additionalProperties: false,
}

const REQUESTED_EXAMS_SCHEMA = {
  type: 'object',
  properties: {
    exams: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nome do exame, ex: "Hemograma completo"' },
          notes: { type: 'string', description: 'Preparo ou observação, se houver, ex: "jejum de 12h"' },
        },
        required: ['name'],
        additionalProperties: false,
      },
    },
  },
  required: ['exams'],
  additionalProperties: false,
}

const LAB_RESULTS_SCHEMA = {
  type: 'object',
  properties: {
    readings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          metricKey: {
            type: 'string',
            description: 'Chave de uma métrica existente da lista fornecida, ou uma nova chave em camelCase sem acentos se nenhuma corresponder',
          },
          label: { type: 'string', description: 'Nome do exame como aparece no laudo' },
          value: { type: 'number', description: 'Valor numérico (vírgula decimal convertida para ponto)' },
          unit: { type: 'string' },
          collectedOn: { type: 'string', description: 'Data de coleta YYYY-MM-DD, se visível no laudo' },
          refLow: { type: 'number', description: 'Limite inferior do valor de referência impresso no laudo, se houver' },
          refHigh: { type: 'number', description: 'Limite superior do valor de referência impresso no laudo, se houver' },
          refText: { type: 'string', description: 'Valor de referência como impresso no laudo, ex: "70 a 99 mg/dL" ou "inferior a 200"' },
        },
        required: ['metricKey', 'label', 'value'],
        additionalProperties: false,
      },
    },
  },
  required: ['readings'],
  additionalProperties: false,
}

const BASE_RULES = 'Extraia somente o que está claramente escrito no documento. Não invente, não complete e não estime valores. Se não encontrar nada, retorne uma lista vazia.'

// PDFs go in a document block, images in an image block; the file comes
// before the instruction text.
function fileBlock(fileBuffer, contentType) {
  const source = { type: 'base64', media_type: contentType, data: fileBuffer.toString('base64') }
  return contentType === 'application/pdf' ? { type: 'document', source } : { type: 'image', source }
}

// Rate limits (429) and transient 5xx errors are retried by the SDK itself
// (maxRetries, honoring retry-after), configured where the client is built.
async function extractWithClaude({ client, fileBuffer, contentType, system, instruction, schema }) {
  const response = await client.beta.messages.create({
    model: EXTRACTION_MODEL.value(),
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content: [fileBlock(fileBuffer, contentType), { type: 'text', text: instruction }] }],
    output_config: { format: { type: 'json_schema', schema } },
    // If a safety classifier declines the request, the API re-runs it on
    // Anthropic's recommended fallback model instead of returning a refusal.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  })

  // A refusal or a truncated reply may not match the schema.
  if (response.stop_reason === 'refusal') throw new Error(`Model refused: ${response.stop_details?.category ?? 'unknown'}`)
  if (response.stop_reason === 'max_tokens') throw new Error('Model output truncated (max_tokens)')

  const text = response.content.find((b) => b.type === 'text')?.text
  if (!text) throw new Error('Empty response from model')
  return JSON.parse(text)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cleanText(value, max = 300) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function slugify(str) {
  const slug = str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '')
  return slug.slice(0, 40) || 'metrica'
}

function safeMetricKey(proposedKey, label) {
  return /^[a-zA-Z][a-zA-Z0-9]{0,39}$/.test(proposedKey || '') ? proposedKey : slugify(label || '')
}

function parseCollectedOn(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00Z`)
  if (isNaN(date) || date.getTime() > Date.now() + 24 * 60 * 60 * 1000) return null
  return Timestamp.fromDate(date)
}

function cleanNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

// 'low' | 'high' | 'normal' against the range printed on the report, or
// null when the report shows no usable range. Computed here rather than
// asked of the model, so the flag always agrees with the numbers stored.
function rangeFlag(value, refLow, refHigh) {
  if (refLow === null && refHigh === null) return null
  if (refLow !== null && value < refLow) return 'low'
  if (refHigh !== null && value > refHigh) return 'high'
  return 'normal'
}

// So the model picks the right range when the report prints one per sex
// or age group.
function patientContext(profile) {
  const dob = profile?.dateOfBirth ? new Date(profile.dateOfBirth) : null
  const age = dob && !isNaN(dob) ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null
  const parts = [profile?.sexAssignedAtBirth && `sexo ${profile.sexAssignedAtBirth.toLowerCase()}`, age && `${age} anos`].filter(Boolean)
  if (parts.length === 0) return ''
  return `\nPaciente: ${parts.join(', ')}. Se o laudo trouxer mais de uma faixa de referência, use a que se aplica a este paciente.`
}

// Trend alerts: the latest readings of a biomarker (one per day) each move
// the same way and add up to a large change, e.g. ferritin 180 -> 100 -> 80.
// Trends in the type's goodDirection (LDL falling on treatment) don't alert.
const TREND_MIN_READINGS = 3
const TREND_MIN_CHANGE_PERCENT = 20
const TREND_MAX_VALUES = 6

// readings: [{ value, unit, recordedAt (Timestamp) }] of one biomarker type.
function detectTrend(readings, goodDirection) {
  const byDay = new Map()
  ;[...readings]
    .sort((a, b) => a.recordedAt.toMillis() - b.recordedAt.toMillis())
    .forEach((r) => byDay.set(r.recordedAt.toDate().toISOString().slice(0, 10), r)) // last of the day wins
  const series = [...byDay.values()]
  if (series.length < TREND_MIN_READINGS) return null

  const last = series[series.length - 1]
  const sameUnit = (r) => (r.unit || '').toLowerCase() === (last.unit || '').toLowerCase()
  const step = (a, b) => (b.value < a.value ? 'down' : b.value > a.value ? 'up' : null)
  const direction = step(series[series.length - 2], last)
  if (!direction || direction === goodDirection) return null

  let start = series.length - 1
  while (start > 0 && sameUnit(series[start - 1]) && step(series[start - 1], series[start]) === direction) start--
  const run = series.slice(start)
  if (run.length < TREND_MIN_READINGS || run[0].value === 0) return null

  const percent = ((last.value - run[0].value) / Math.abs(run[0].value)) * 100
  if (Math.abs(percent) < TREND_MIN_CHANGE_PERCENT) return null
  return {
    direction,
    percent: Math.round(percent),
    count: run.length,
    unit: last.unit || '',
    values: run.slice(-TREND_MAX_VALUES).map((r) => ({ value: r.value, recordedAt: r.recordedAt })),
  }
}

// Only creates a biomarker type if it doesn't exist yet — never
// overwrites a curated label like "LDL" with a lab's "Colesterol LDL calculado".
async function ensureBiomarkerType(key, label, unit) {
  try {
    await db.collection('biomarkerTypes').doc(key).create({ label, unit: unit || '', createdBy: 'extraction' })
  } catch (err) {
    if (err.code !== 6) throw err // 6 = ALREADY_EXISTS
  }
}

// ---------------------------------------------------------------------------
// Per-kind processors. Each returns the fields to merge into the doc(s).
// ---------------------------------------------------------------------------

async function processPrescription({ client, fileBuffer, contentType }) {
  const result = await extractWithClaude({
    client, fileBuffer, contentType, schema: MEDICATIONS_SCHEMA,
    system: `Você extrai medicamentos de receitas médicas brasileiras. ${BASE_RULES}`,
    instruction: 'Extraia os medicamentos desta receita.',
  })
  const medications = (result.medications || [])
    .map((m) => ({ name: cleanText(m.name, 120), dosage: cleanText(m.dosage, 80), instructions: cleanText(m.instructions) }))
    .filter((m) => m.name)
  return { medications }
}

async function processExamRequest({ client, fileBuffer, contentType }) {
  const result = await extractWithClaude({
    client, fileBuffer, contentType, schema: REQUESTED_EXAMS_SCHEMA,
    system: `Você extrai os exames solicitados em pedidos médicos brasileiros. ${BASE_RULES}`,
    instruction: 'Extraia os exames solicitados neste pedido.',
  })
  const requestedExams = (result.exams || [])
    .map((e) => ({ name: cleanText(e.name, 120), notes: cleanText(e.notes, 200) }))
    .filter((e) => e.name)
  return { requestedExams }
}

async function processExamResult({ client, fileBuffer, contentType, patientUid, examId }) {
  // Give the model the existing biomarker keys so "Colesterol LDL" maps to
  // the existing "ldl" key instead of spawning a near-duplicate type.
  const [typesSnapshot, profileSnapshot] = await Promise.all([
    db.collection('biomarkerTypes').get(),
    db.doc(`users/${patientUid}`).get(),
  ])
  const knownMetrics = typesSnapshot.docs.map((d) => ({ key: d.id, label: d.data().label, unit: d.data().unit }))
  const types = Object.fromEntries(typesSnapshot.docs.map((d) => [d.id, d.data()]))

  const result = await extractWithClaude({
    client, fileBuffer, contentType, schema: LAB_RESULTS_SCHEMA,
    system: `Você extrai resultados numéricos de laudos laboratoriais brasileiros. ${BASE_RULES}
Para cada resultado, copie também o valor de referência impresso no laudo: refLow e refHigh são os limites numéricos (omita o que não houver, ex: "inferior a 200" tem só refHigh = 200).${patientContext(profileSnapshot.data())}
Métricas já conhecidas pelo sistema (reutilize a chave sempre que o exame corresponder):
${JSON.stringify(knownMetrics)}`,
    instruction: 'Extraia os resultados deste laudo.',
  })

  const readings = (result.readings || [])
    .filter((r) => typeof r.value === 'number' && Number.isFinite(r.value) && r.label)
    .map((r) => {
      let refLow = cleanNumber(r.refLow)
      let refHigh = cleanNumber(r.refHigh)
      if (refLow !== null && refHigh !== null && refLow > refHigh) refLow = refHigh = null
      return {
        biomarkerType: safeMetricKey(r.metricKey, r.label),
        label: cleanText(r.label, 120),
        value: r.value,
        unit: cleanText(r.unit, 30),
        recordedAt: parseCollectedOn(r.collectedOn) || Timestamp.now(),
        refLow,
        refHigh,
        refText: cleanText(r.refText, 120),
        flag: rangeFlag(r.value, refLow, refHigh),
      }
    })

  for (const r of readings) {
    await ensureBiomarkerType(r.biomarkerType, r.label, r.unit)
  }

  // Idempotent: Storage triggers can be delivered more than once, so wipe
  // any biomarkers a previous attempt wrote for this exam before writing.
  const biomarkersCol = db.collection('biomarkers')
  const previous = await biomarkersCol.where('examId', '==', examId).get()
  const batch = db.batch()
  previous.docs.forEach((d) => batch.delete(d.ref))
  readings.forEach((r, i) => {
    batch.set(biomarkersCol.doc(`${examId}_${i}`), {
      patientId: patientUid,
      biomarkerType: r.biomarkerType,
      value: r.value,
      unit: r.unit,
      recordedAt: r.recordedAt,
      refLow: r.refLow,
      refHigh: r.refHigh,
      flag: r.flag,
      source: 'exam',
      examId,
    })
  })
  await batch.commit()

  // With this exam's readings saved, check each of its biomarkers against
  // the patient's whole history (other exams and manual readings).
  const history = await biomarkersCol.where('patientId', '==', patientUid).get()
  const historyByType = {}
  history.docs.forEach((d) => {
    const { biomarkerType, value, unit, recordedAt } = d.data()
    ;(historyByType[biomarkerType] ||= []).push({ value, unit, recordedAt })
  })
  const trendAlerts = [...new Set(readings.map((r) => r.biomarkerType))]
    .map((key) => {
      const trend = detectTrend(historyByType[key] || [], types[key]?.goodDirection)
      const label = types[key]?.label || readings.find((r) => r.biomarkerType === key).label
      return trend && { biomarkerType: key, label, ...trend }
    })
    .filter(Boolean)

  return {
    extractedValues: readings.map(({ biomarkerType, label, value, unit, refLow, refHigh, refText, flag }) => ({
      biomarkerType, label, value, unit, refLow, refHigh, refText, flag,
    })),
    trendAlerts,
  }
}

const PROCESSORS = {
  prescription: processPrescription,
  examRequest: processExamRequest,
  examResult: processExamResult,
}

// ---------------------------------------------------------------------------
// Trigger
// ---------------------------------------------------------------------------

exports.processUploadedFile = onObjectFinalized(
  // 540s: fits the SDK's worst case of 3 attempts x 150s (see the client
  // options below) plus retry backoff.
  // us-east1: a Storage trigger must run in its bucket's region.
  { region: 'us-east1', secrets: [ANTHROPIC_API_KEY], memory: '1GiB', timeoutSeconds: 540 },
  async (event) => {
    const storagePath = event.data.name
    const contentType = event.data.contentType
    const size = Number(event.data.size || 0)

    const route = ROUTES.find((r) => r.re.test(storagePath))
    if (!route) return // Not a file this function processes.

    const [, patientUid, docId] = storagePath.match(route.re)
    const docRef = db.doc(`${route.collection}/${docId}`)
    const snapshot = await docRef.get()

    // Orphan upload (no matching record) — nothing to update, don't create one.
    if (!snapshot.exists) {
      logger.warn('No Firestore doc for uploaded file, skipping', { storagePath })
      return
    }

    // The path names the patient; never write extracted data (or biomarkers)
    // for a doc that belongs to someone else.
    if (snapshot.data().patientId !== patientUid) {
      logger.warn('Storage path patient does not match the doc, skipping', { storagePath })
      return
    }

    // Retried delivery of an event we already finished.
    if (snapshot.data().processingStatus === 'completed') return

    const update = (fields) => docRef.set(fields, { merge: true })

    if (!SUPPORTED_TYPES.has(contentType) || size > MAX_FILE_BYTES) {
      await update({
        processingStatus: 'failed',
        processingError: size > MAX_FILE_BYTES ? 'file_too_large' : 'unsupported_type',
        processedAt: FieldValue.serverTimestamp(),
      })
      return
    }

    await update({ processingStatus: 'processing', processingError: FieldValue.delete() })

    try {
      const [fileBuffer] = await getStorage().bucket(event.data.bucket).file(storagePath).download()
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value(), timeout: 150_000, maxRetries: 2 })
      const extracted = await PROCESSORS[route.kind]({ client, fileBuffer, contentType, patientUid, examId: docId })

      await update({ ...extracted, processingStatus: 'completed', processedAt: FieldValue.serverTimestamp() })
      logger.info('Extraction completed', { storagePath, kind: route.kind })
    } catch (err) {
      // Full detail goes to the logs only; the doc gets a short code the UI
      // can show without leaking internals.
      logger.error('Extraction failed', { storagePath, kind: route.kind, error: err.message })
      await update({
        processingStatus: 'failed',
        processingError: 'extraction_failed',
        processedAt: FieldValue.serverTimestamp(),
      })
    }
  }
)

// Notifications + push (Firestore triggers), see notifications.js.
Object.assign(exports, require('./notifications'))
