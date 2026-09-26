import { collection, doc, addDoc, setDoc, getDocs, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
export { formatRelativeDate } from './dateUtils'

// Collection: users/{uid}/exams/{examId}
// Fields: title, status ('solicitado' | 'em_andamento' | 'realizado'),
//         priority ('prioritario' | 'rotina'), scheduledDate, category
//         ('laboratorial' | 'imagem' | 'documento')
// Optional (set when a doctor attaches a request PDF):
//         doctorUid, doctorName, attachmentUrl, attachmentFileName
// Optional (set when a patient submits their own exam result — see examReviewService.js):
//         reviewStatus ('not_reviewed' | 'reviewed')
// Optional (set by the Cloud Function in functions/index.js once it processes
// an attached PDF — see storageService.uploadExamRequestFile / uploadExamResultFile):
//         processingStatus ('pending' | 'processing' | 'completed' | 'failed'),
//         processingError,
//         requestedExams: [{ name, notes }]     (doctor's request PDF)
//         extractedValues: [{ metricKey, label, value, unit }]  (patient's result PDF)

export async function getExams(uid) {
  const q = query(collection(db, 'users', uid, 'exams'), orderBy('scheduledDate', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, scheduledDate: data.scheduledDate?.toDate?.() || null }
  })
}

// Live version — used where the UI should reflect processingStatus changing
// in the background (e.g. PlanPage), without the user needing to refresh.
export function subscribeToExams(uid, callback, onError) {
  const q = query(collection(db, 'users', uid, 'exams'), orderBy('scheduledDate', 'asc'))
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => {
        const data = d.data()
        return { id: d.id, ...data, scheduledDate: data.scheduledDate?.toDate?.() || null }
      })
    )
  }, onError)
}

export async function addExam(uid, exam) {
  const docRef = await addDoc(collection(db, 'users', uid, 'exams'), {
    ...exam,
    scheduledDate: exam.scheduledDate ? Timestamp.fromDate(exam.scheduledDate) : null,
  })
  return docRef.id
}

export async function updateExamStatus(uid, examId, status) {
  await setDoc(doc(db, 'users', uid, 'exams', examId), { status }, { merge: true })
}

// Called after the PDF upload succeeds. Deliberately does NOT touch
// processingStatus — see the matching comment in conductsService.
export async function attachExamFile(uid, examId, { attachmentUrl, attachmentFileName }) {
  await setDoc(doc(db, 'users', uid, 'exams', examId), { attachmentUrl, attachmentFileName }, { merge: true })
}

export async function markExamUploadFailed(uid, examId) {
  await setDoc(
    doc(db, 'users', uid, 'exams', examId),
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
