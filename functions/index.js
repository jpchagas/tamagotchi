const { onObjectFinalized } = require('firebase-functions/v2/storage')
const { defineSecret, defineString } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')
const admin = require('firebase-admin')
const { GoogleGenAI, Type } = require('@google/genai')

admin.initializeApp()
const db = admin.firestore()
const { FieldValue, Timestamp } = admin.firestore

// API key from Google AI Studio (aistudio.google.com/apikey).
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
// Configurable so the model can be swapped (e.g. to a newer Flash model)
// without touching code — set it in functions/.env as EXTRACTION_MODEL=...
const EXTRACTION_MODEL = defineString('EXTRACTION_MODEL', { default: 'gemini-2.5-flash' })

// Files are sent inline (base64). Gemini caps inline requests at ~20 MB and
// base64 inflates size by ~33%, so 14 MB is the safe ceiling for the file.
const MAX_FILE_BYTES = 14 * 1024 * 1024
const SUPPORTED_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg'])

// Storage paths are self-describing, so this function never guesses which
// Firestore doc to update or which extraction to run. The client creates the
// doc (with processingStatus 'pending') BEFORE uploading, so the id exists.
//   users/{patientUid}/conducts/{conductId}/prescription-{file} -> medication list
//   users/{patientUid}/exams/{examId}/request-{file}            -> requested exams
//   users/{patientUid}/exams/{examId}/result-{file}             -> lab values -> metricReadings
const ROUTES = [
  { kind: 'prescription', re: /^users\/([^/]+)\/conducts\/([^/]+)\/prescription-/, collection: 'conducts' },
  { kind: 'examRequest', re: /^users\/([^/]+)\/exams\/([^/]+)\/request-/, collection: 'exams' },
  { kind: 'examResult', re: /^users\/([^/]+)\/exams\/([^/]+)\/result-/, collection: 'exams' },
]

// ---------------------------------------------------------------------------
// Extraction schemas. Gemini's structured output (responseMimeType +
// responseSchema) guarantees the reply is JSON in exactly this shape — no
// free-text parsing, no stripping of ``` fences.
// ---------------------------------------------------------------------------

const MEDICATIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    medications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Nome do medicamento, como escrito na receita' },
          dosage: { type: Type.STRING, description: 'Dose/concentração, ex: "20 mg"' },
          instructions: { type: Type.STRING, description: 'Posologia e orientações, ex: "1 comprimido à noite"' },
        },
        required: ['name'],
      },
    },
  },
  required: ['medications'],
}

const REQUESTED_EXAMS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    exams: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Nome do exame, ex: "Hemograma completo"' },
          notes: { type: Type.STRING, description: 'Preparo ou observação, se houver, ex: "jejum de 12h"' },
        },
        required: ['name'],
      },
    },
  },
  required: ['exams'],
}

const LAB_RESULTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    readings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          metricKey: {
            type: Type.STRING,
            description: 'Chave de uma métrica existente da lista fornecida, ou uma nova chave em camelCase sem acentos se nenhuma corresponder',
          },
          label: { type: Type.STRING, description: 'Nome do exame como aparece no laudo' },
          value: { type: Type.NUMBER, description: 'Valor numérico (vírgula decimal convertida para ponto)' },
          unit: { type: Type.STRING },
          collectedOn: { type: Type.STRING, description: 'Data de coleta YYYY-MM-DD, se visível no laudo' },
        },
        required: ['metricKey', 'label', 'value'],
      },
    },
  },
  required: ['readings'],
}

const BASE_RULES = 'Extraia somente o que está claramente escrito no documento. Não invente, não complete e não estime valores. Se não encontrar nada, retorne uma lista vazia.'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The free tier allows only a handful of requests per minute, so several
// uploads landing at once can hit 429 RESOURCE_EXHAUSTED. Back off and
// retry a few times before giving up and marking the document as failed.
async function extractWithGemini({ ai, fileBuffer, contentType, system, instruction, schema }) {
  const delays = [15000, 30000, 60000]
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: EXTRACTION_MODEL.value(),
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: contentType, data: fileBuffer.toString('base64') } },
              { text: instruction },
            ],
          },
        ],
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseSchema: schema,
          temperature: 0,
        },
      })
      if (!response.text) throw new Error('Empty response from model')
      return JSON.parse(response.text)
    } catch (err) {
      const rateLimited = err?.status === 429 || /RESOURCE_EXHAUSTED|429/.test(err?.message || '')
      if (!rateLimited || attempt >= delays.length) throw err
      logger.warn('Gemini rate limited, retrying', { attempt: attempt + 1 })
      await sleep(delays[attempt])
    }
  }
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

// Only creates a metric definition if it doesn't exist yet — never
// overwrites a curated label like "LDL" with a lab's "Colesterol LDL calculado".
async function ensureMetricDefinition(key, label, unit) {
  try {
    await db.collection('metrics').doc(key).create({ label, unit: unit || '', createdBy: 'extraction' })
  } catch (err) {
    if (err.code !== 6) throw err // 6 = ALREADY_EXISTS
  }
}

// ---------------------------------------------------------------------------
// Per-kind processors. Each returns the fields to merge into the doc(s).
// ---------------------------------------------------------------------------

async function processPrescription({ ai, fileBuffer, contentType }) {
  const result = await extractWithGemini({
    ai, fileBuffer, contentType, schema: MEDICATIONS_SCHEMA,
    system: `Você extrai medicamentos de receitas médicas brasileiras. ${BASE_RULES}`,
    instruction: 'Extraia os medicamentos desta receita.',
  })
  const medications = (result.medications || [])
    .map((m) => ({ name: cleanText(m.name, 120), dosage: cleanText(m.dosage, 80), instructions: cleanText(m.instructions) }))
    .filter((m) => m.name)
  return { medications }
}

async function processExamRequest({ ai, fileBuffer, contentType }) {
  const result = await extractWithGemini({
    ai, fileBuffer, contentType, schema: REQUESTED_EXAMS_SCHEMA,
    system: `Você extrai os exames solicitados em pedidos médicos brasileiros. ${BASE_RULES}`,
    instruction: 'Extraia os exames solicitados neste pedido.',
  })
  const requestedExams = (result.exams || [])
    .map((e) => ({ name: cleanText(e.name, 120), notes: cleanText(e.notes, 200) }))
    .filter((e) => e.name)
  return { requestedExams }
}

async function processExamResult({ ai, fileBuffer, contentType, patientUid, examId }) {
  // Give the model the existing metric keys so "Colesterol LDL" maps to the
  // existing "ldl" key instead of spawning a near-duplicate metric.
  const metricsSnapshot = await db.collection('metrics').get()
  const knownMetrics = metricsSnapshot.docs.map((d) => ({ key: d.id, label: d.data().label, unit: d.data().unit }))

  const result = await extractWithGemini({
    ai, fileBuffer, contentType, schema: LAB_RESULTS_SCHEMA,
    system: `Você extrai resultados numéricos de laudos laboratoriais brasileiros. ${BASE_RULES}
Métricas já conhecidas pelo sistema (reutilize a chave sempre que o exame corresponder):
${JSON.stringify(knownMetrics)}`,
    instruction: 'Extraia os resultados deste laudo.',
  })

  const readings = (result.readings || [])
    .filter((r) => typeof r.value === 'number' && Number.isFinite(r.value) && r.label)
    .map((r) => ({
      metricKey: safeMetricKey(r.metricKey, r.label),
      label: cleanText(r.label, 120),
      value: r.value,
      unit: cleanText(r.unit, 30),
      recordedAt: parseCollectedOn(r.collectedOn) || Timestamp.now(),
    }))

  for (const r of readings) {
    await ensureMetricDefinition(r.metricKey, r.label, r.unit)
  }

  // Idempotent: Storage triggers can be delivered more than once, so wipe
  // any readings a previous attempt wrote for this exam before writing.
  const readingsCol = db.collection(`users/${patientUid}/metricReadings`)
  const previous = await readingsCol.where('examId', '==', examId).get()
  const batch = db.batch()
  previous.docs.forEach((d) => batch.delete(d.ref))
  readings.forEach((r, i) => {
    batch.set(readingsCol.doc(`${examId}_${i}`), {
      metricKey: r.metricKey,
      value: r.value,
      recordedAt: r.recordedAt,
      source: 'examResult',
      examId,
    })
  })
  await batch.commit()

  return {
    extractedValues: readings.map(({ metricKey, label, value, unit }) => ({ metricKey, label, value, unit })),
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
  // 540s: leaves room for the rate-limit backoff (up to ~105s of waiting)
  // on top of the model call itself.
  { secrets: [GEMINI_API_KEY], memory: '1GiB', timeoutSeconds: 540 },
  async (event) => {
    const storagePath = event.data.name
    const contentType = event.data.contentType
    const size = Number(event.data.size || 0)

    const route = ROUTES.find((r) => r.re.test(storagePath))
    if (!route) return // Not a file this function processes.

    const [, patientUid, docId] = storagePath.match(route.re)
    const docRef = db.doc(`users/${patientUid}/${route.collection}/${docId}`)
    const snapshot = await docRef.get()

    // Orphan upload (no matching record) — nothing to update, don't create one.
    if (!snapshot.exists) {
      logger.warn('No Firestore doc for uploaded file, skipping', { storagePath })
      return
    }

    // Retried delivery of an event we already finished.
    if (snapshot.data().processingStatus === 'completed') return

    // Patient-submitted results are mirrored on the doctor's review queue,
    // so every status change has to land in both places.
    const refs = [docRef]
    const doctorUid = snapshot.data().doctorUid
    if (route.kind === 'examResult' && doctorUid) {
      refs.push(db.doc(`users/${doctorUid}/examReviews/${docId}`))
    }
    const updateAll = (fields) => {
      const batch = db.batch()
      refs.forEach((ref) => batch.set(ref, fields, { merge: true }))
      return batch.commit()
    }

    if (!SUPPORTED_TYPES.has(contentType) || size > MAX_FILE_BYTES) {
      await updateAll({
        processingStatus: 'failed',
        processingError: size > MAX_FILE_BYTES ? 'file_too_large' : 'unsupported_type',
        processedAt: FieldValue.serverTimestamp(),
      })
      return
    }

    await updateAll({ processingStatus: 'processing', processingError: FieldValue.delete() })

    try {
      const [fileBuffer] = await admin.storage().bucket(event.data.bucket).file(storagePath).download()
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() })
      const extracted = await PROCESSORS[route.kind]({ ai, fileBuffer, contentType, patientUid, examId: docId })

      await updateAll({ ...extracted, processingStatus: 'completed', processedAt: FieldValue.serverTimestamp() })
      logger.info('Extraction completed', { storagePath, kind: route.kind })
    } catch (err) {
      // Full detail goes to the logs only; the doc gets a short code the UI
      // can show without leaking internals.
      logger.error('Extraction failed', { storagePath, kind: route.kind, error: err.message })
      await updateAll({
        processingStatus: 'failed',
        processingError: 'extraction_failed',
        processedAt: FieldValue.serverTimestamp(),
      })
    }
  }
)
