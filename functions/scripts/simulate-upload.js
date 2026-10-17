// Drives the processUploadedFile workflow end to end against the local
// emulators, doing exactly what the web client does:
//   1. create the Firestore doc with processingStatus 'pending'
//   2. upload the file to the Storage path the function's ROUTES match
//   3. watch the doc until the function marks it 'completed' or 'failed'
//
// Usage (emulators must be running, see `npm run emulators`):
//   node scripts/simulate-upload.js <prescription|examRequest|examResult> <file>

// Set before firebase-admin loads, so this script can only ever talk to
// the local emulators, never to a real project.
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST || '127.0.0.1:9199'

const fs = require('fs')
const path = require('path')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage')

const PROJECT_ID = 'demo-tamagotchi'
const BUCKET = `${PROJECT_ID}.appspot.com`
const PATIENT_UID = 'local-patient'
const DOCTOR_UID = 'local-doctor'
const TIMEOUT_MS = 10 * 60 * 1000

const CONTENT_TYPES = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }

initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET })
const db = getFirestore()

// Same doc shapes the client writes (SendPrescriptionPage, SubmitExamResultPage).
async function createPendingDoc(kind, title) {
  const doctorFields = { patientId: PATIENT_UID, doctorId: DOCTOR_UID, doctorName: 'Dr. Local', processingStatus: 'pending' }

  if (kind === 'prescription') {
    const ref = db.collection('conducts').doc()
    await ref.set({ title, why: '', timeframe: 'agora', type: 'medication', status: 'pending', dueDate: Timestamp.now(), ...doctorFields })
    return { ref, storagePath: (name) => `users/${PATIENT_UID}/conducts/${ref.id}/prescription-${name}` }
  }

  if (kind === 'examRequest') {
    const ref = db.collection('exams').doc()
    await ref.set({ title, kind: 'request', status: 'solicitado', priority: 'rotina', icon: 'lab', scheduledDate: Timestamp.now(), ...doctorFields })
    return { ref, storagePath: (name) => `users/${PATIENT_UID}/exams/${ref.id}/request-${name}` }
  }

  // examResult: mirrors examReviewService.createExamResultDraft
  const ref = db.collection('exams').doc()
  const submittedAt = Timestamp.now()
  await ref.set({
    title, kind: 'result', patientName: 'Paciente Local', status: 'realizado', priority: 'rotina', icon: 'lab',
    category: 'laboratorial', scheduledDate: submittedAt, submittedAt, reviewStatus: 'not_reviewed', ...doctorFields,
  })
  return { ref, storagePath: (name) => `users/${PATIENT_UID}/exams/${ref.id}/result-${name}` }
}

function waitForResult(ref) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Timed out after ${TIMEOUT_MS / 1000}s. Is the functions emulator running?`))
    }, TIMEOUT_MS)
    const unsubscribe = ref.onSnapshot((snap) => {
      const status = snap.get('processingStatus')
      console.log(`  processingStatus: ${status}`)
      if (status === 'completed' || status === 'failed') {
        clearTimeout(timer)
        unsubscribe()
        resolve(snap.data())
      }
    }, reject)
  })
}

async function main() {
  const [kind, filePath] = process.argv.slice(2)
  if (!['prescription', 'examRequest', 'examResult'].includes(kind) || !filePath) {
    console.error('Usage: node scripts/simulate-upload.js <prescription|examRequest|examResult> <file>')
    process.exit(1)
  }

  const fileName = path.basename(filePath)
  const contentType = CONTENT_TYPES[path.extname(fileName).toLowerCase()] || 'application/octet-stream'
  const { ref, storagePath } = await createPendingDoc(kind, fileName)
  console.log(`Created ${ref.path} (pending)`)

  const destination = storagePath(fileName)
  await getStorage().bucket().upload(filePath, { destination, contentType })
  console.log(`Uploaded gs://${BUCKET}/${destination}`)
  console.log('Waiting for processUploadedFile...')

  const data = await waitForResult(ref)
  const { medications, requestedExams, extractedValues, processingStatus, processingError } = data
  console.log('\nResult:')
  console.log(JSON.stringify({ processingStatus, processingError, medications, requestedExams, extractedValues }, null, 2))

  if (kind === 'examResult') {
    const biomarkers = await db.collection('biomarkers').where('examId', '==', ref.id).get()
    console.log(`\nbiomarkers written: ${biomarkers.size}`)
    biomarkers.docs.forEach((d) => console.log(`  ${d.id}: ${d.get('biomarkerType')} = ${d.get('value')} ${d.get('unit')}`))
  }

  console.log('\nBrowse everything at http://127.0.0.1:4000')
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
