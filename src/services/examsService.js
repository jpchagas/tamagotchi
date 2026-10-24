import { collection, doc, addDoc, setDoc, getDocs, onSnapshot, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
export { formatRelativeDate } from './dateUtils'

// Collection: exams/{examId}
// Fields: patientId, title, kind ('request' | 'result'),
//         status ('solicitado' | 'em_andamento' | 'realizado'),
//         priority ('prioritario' | 'rotina'), scheduledDate, category
//         ('laboratorial' | 'imagem' | 'documento'), icon
// Optional (set when a doctor attaches a request PDF, or a patient submits
// a result to a doctor): doctorId, doctorName, attachmentUrl, attachmentFileName
// Results only (see examReviewService.js): patientName, submittedAt,
//         reviewStatus ('not_reviewed' | 'reviewed')
// Optional (set by the Cloud Function in functions/index.js once it processes
// an attached file — see storageService.uploadExamRequestFile / uploadExamResultFile):
//         processingStatus ('pending' | 'processing' | 'completed' | 'failed'),
//         processingError,
//         requestedExams: [{ name, notes }]     (doctor's request PDF)
//         extractedValues: [{ biomarkerType, label, value, unit,   (patient's result)
//                             refLow, refHigh, refText, flag ('low' | 'high' | 'normal' | null) }]
//         trendAlerts: [{ biomarkerType, label, direction ('down' | 'up'), percent,
//                         count, unit, values: [{ value, recordedAt }] }]  (doctor only)

export function toExam(d) {
  const data = d.data()
  return {
    id: d.id,
    ...data,
    scheduledDate: data.scheduledDate?.toDate?.() || null,
    submittedAt: data.submittedAt?.toDate?.() || null,
    trendAlerts: (data.trendAlerts || []).map((t) => ({
      ...t,
      values: (t.values || []).map((v) => ({ ...v, recordedAt: v.recordedAt?.toDate?.() || null })),
    })),
  }
}

// Sorted in memory so the query stays equality-only — see careTeamService.
function sortByScheduledDate(exams) {
  return exams.sort((a, b) => (a.scheduledDate?.getTime() ?? Infinity) - (b.scheduledDate?.getTime() ?? Infinity))
}

function patientExamsQuery(patientId) {
  return query(collection(db, 'exams'), where('patientId', '==', patientId))
}

export async function getExams(patientId) {
  const snapshot = await getDocs(patientExamsQuery(patientId))
  return sortByScheduledDate(snapshot.docs.map(toExam))
}

// Live version — used where the UI should reflect processingStatus changing
// in the background (e.g. PlanPage), without the user needing to refresh.
export function subscribeToExams(patientId, callback, onError) {
  return onSnapshot(
    patientExamsQuery(patientId),
    (snapshot) => callback(sortByScheduledDate(snapshot.docs.map(toExam))),
    onError
  )
}

export async function addExam(patientId, exam) {
  const docRef = await addDoc(collection(db, 'exams'), {
    kind: 'request',
    ...exam,
    patientId,
    scheduledDate: exam.scheduledDate ? Timestamp.fromDate(exam.scheduledDate) : null,
  })
  return docRef.id
}

export async function updateExamStatus(examId, status) {
  await setDoc(doc(db, 'exams', examId), { status }, { merge: true })
}

// Called after the file upload succeeds. Deliberately does NOT touch
// processingStatus — see the matching comment in conductsService.
export async function attachExamFile(examId, { attachmentUrl, attachmentFileName }) {
  await setDoc(doc(db, 'exams', examId), { attachmentUrl, attachmentFileName }, { merge: true })
}

export async function markExamUploadFailed(examId) {
  await setDoc(
    doc(db, 'exams', examId),
    { processingStatus: 'failed', processingError: 'upload_failed' },
    { merge: true }
  )
}

export function groupByStatus(exams) {
  return exams.reduce(
    (acc, e) => {
      const key = acc[e.status] ? e.status : 'solicitado'
      acc[key].push(e)
      return acc
    },
    { solicitado: [], em_andamento: [], realizado: [] }
  )
}
