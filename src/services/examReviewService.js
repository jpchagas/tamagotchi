import { collection, doc, setDoc, getDocs, onSnapshot, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { toExam } from './examsService'

// Exam results a patient submits for a doctor to review. They are ordinary
// docs in the root `exams` collection (kind 'result') carrying both
// patientId and doctorId, so the patient's Agenda and the doctor's review
// queue read the same document — there is no copy to keep in sync.
//
// This is a TWO-STEP flow, not one write: the doc must exist (with a real
// examId) *before* the file is uploaded, because the Storage path embeds
// that examId so the Cloud Function knows which doc to update. See
// storageService.uploadExamResultFile and functions/index.js. After the
// upload, attach the file with examsService.attachExamFile (or
// markExamUploadFailed if it didn't make it).

export async function createExamResultDraft({ patientUid, patientProfile, doctorUid, doctorName, title, category }) {
  const examRef = doc(collection(db, 'exams'))
  const submittedAt = Timestamp.now()

  await setDoc(examRef, {
    patientId: patientUid,
    patientName: patientProfile?.fullName || '',
    doctorId: doctorUid,
    doctorName,
    kind: 'result',
    title,
    status: 'realizado',
    priority: 'rotina',
    icon: 'lab',
    category: category || 'documento',
    scheduledDate: submittedAt,
    submittedAt,
    reviewStatus: 'not_reviewed',
    processingStatus: 'pending',
  })

  return examRef.id
}

export async function markExamReviewed(examId) {
  await setExamReviewed(examId, true)
}

export async function setExamReviewed(examId, reviewed) {
  await setDoc(doc(db, 'exams', examId), { reviewStatus: reviewed ? 'reviewed' : 'not_reviewed' }, { merge: true })
}

function doctorResultsQuery(doctorId) {
  return query(collection(db, 'exams'), where('doctorId', '==', doctorId), where('kind', '==', 'result'))
}

const newestFirst = (reviews) => reviews.sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))

export async function getDoctorExamReviews(doctorId) {
  const snapshot = await getDocs(doctorResultsQuery(doctorId))
  return newestFirst(snapshot.docs.map(toExam))
}

// Live version — so ExamesPage reflects processingStatus changing in the
// background (the Cloud Function runs asynchronously, on its own schedule).
export function subscribeToDoctorExamReviews(doctorId, callback, onError) {
  return onSnapshot(
    doctorResultsQuery(doctorId),
    (snapshot) => callback(newestFirst(snapshot.docs.map(toExam))),
    onError
  )
}

// Replaces the old denormalized `hasPendingReview` flag: one query over the
// doctor's results gives the set of patients with something to review.
export async function getPatientIdsWithPendingReview(doctorId) {
  const reviews = await getDoctorExamReviews(doctorId)
  return new Set(reviews.filter((r) => r.reviewStatus === 'not_reviewed').map((r) => r.patientId))
}

export function groupByReviewStatus(reviews) {
  return reviews.reduce(
    (acc, r) => {
      const key = r.reviewStatus === 'reviewed' ? 'reviewed' : 'not_reviewed'
      acc[key].push(r)
      return acc
    },
    { not_reviewed: [], reviewed: [] }
  )
}

// Legacy items (seeded before `category` existed) fall back to 'documento'.
export function filterByCategory(reviews, category) {
  if (category === 'todos') return reviews
  return reviews.filter((r) => (r.category || 'documento') === category)
}
