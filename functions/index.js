const { onObjectFinalized } = require('firebase-functions/v2/storage')
const { defineSecret, defineString } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const Anthropic = require('@anthropic-ai/sdk')
// Modular import: the emulator wraps admin.firestore and drops its static
// FieldValue/Timestamp, so the namespaced form breaks when run locally.
const { FieldValue, Timestamp } = require('firebase-admin/firestore')

admin.initializeApp()
const db = admin.firestore()

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
  const typesSnapshot = await db.collection('biomarkerTypes').get()
  const knownMetrics = typesSnapshot.docs.map((d) => ({ key: d.id, label: d.data().label, unit: d.data().unit }))

  const result = await extractWithClaude({
    client, fileBuffer, contentType, schema: LAB_RESULTS_SCHEMA,
    system: `Você extrai resultados numéricos de laudos laboratoriais brasileiros. ${BASE_RULES}
Métricas já conhecidas pelo sistema (reutilize a chave sempre que o exame corresponder):
${JSON.stringify(knownMetrics)}`,
    instruction: 'Extraia os resultados deste laudo.',
  })

  const readings = (result.readings || [])
    .filter((r) => typeof r.value === 'number' && Number.isFinite(r.value) && r.label)
    .map((r) => ({
      biomarkerType: safeMetricKey(r.metricKey, r.label),
      label: cleanText(r.label, 120),
      value: r.value,
      unit: cleanText(r.unit, 30),
      recordedAt: parseCollectedOn(r.collectedOn) || Timestamp.now(),
    }))

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
      source: 'exam',
      examId,
    })
  })
  await batch.commit()

  return {
    extractedValues: readings.map(({ biomarkerType, label, value, unit }) => ({ biomarkerType, label, value, unit })),
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
      const [fileBuffer] = await admin.storage().bucket(event.data.bucket).file(storagePath).download()
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
