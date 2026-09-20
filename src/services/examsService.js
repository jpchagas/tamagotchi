import { collection, doc, addDoc, setDoc, getDocs, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
export { formatRelativeDate } from './dateUtils'

// Collection: users/{uid}/exams/{examId}
// Fields: title, status ('solicitado' | 'em_andamento' | 'realizado'),
//         priority ('prioritario' | 'rotina'), scheduledDate
// Optional (set when a doctor attaches a prescription PDF):
//         doctorUid, doctorName, attachmentUrl, attachmentFileName
// Optional (set when a patient submits their own exam result — see examReviewService.js):
//         reviewStatus ('not_reviewed' | 'reviewed')

export async function getExams(uid) {
  const q = query(collection(db, 'users', uid, 'exams'), orderBy('scheduledDate', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, scheduledDate: data.scheduledDate?.toDate?.() || null }
  })
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

