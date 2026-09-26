import { collection, doc, setDoc, getDocs, onSnapshot, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

// A patient submitting an exam result writes to two places, same pattern as
// careTeamService's patient<->doctor linking:
//   users/{patientUid}/exams/{examId}         -> the exam itself (shows in patient's Agenda)
//   users/{doctorUid}/examReviews/{examId}    -> a lightweight pointer so the doctor
//                                                can list pending reviews across ALL
//                                                their patients without a collectionGroup query
// Both copies carry reviewStatus ('not_reviewed' | 'reviewed'), category, and
// (once a file is attached) processingStatus — kept in sync by the functions
// below. The same examId is used in both places.
//
// This is a TWO-STEP flow, not one write: the doc must exist (with a real
// examId) *before* the file is uploaded, because the Storage path embeds
// that examId so the Cloud Function knows which doc to update. See
// storageService.uploadExamResultFile and functions/index.js.
//
// users/{doctorUid}/patients/{patientUid} also gets a denormalized
// hasPendingReview flag, so the Pacientes list can show an alert indicator
// without querying exams per-patient on every render.

export async function createExamResultDraft({ patientUid, patientProfile, doctorUid, doctorName, title, category }) {
  const examRef = doc(collection(db, 'users', patientUid, 'exams'))
  const examId = examRef.id
  const submittedAt = Timestamp.now()

  const batch = writeBatch(db)

  batch.set(examRef, {
    title,
    status: 'realizado',
    priority: 'rotina',
    icon: 'lab',
    category: category || 'documento',
    scheduledDate: submittedAt,
    doctorUid,
    doctorName,
    reviewStatus: 'not_reviewed',
    processingStatus: 'pending',
  })

  batch.set(doc(db, 'users', doctorUid, 'examReviews', examId), {
    examId,
    patientUid,
    patientName: patientProfile?.fullName || '',
    title,
    category: category || 'documento',
    reviewStatus: 'not_reviewed',
    processingStatus: 'pending',
    submittedAt,
  })

  batch.set(doc(db, 'users', doctorUid, 'patients', patientUid), { hasPendingReview: true }, { merge: true })

  await batch.commit()
  return examId
}

// Called after the file upload succeeds. Deliberately does NOT touch
// processingStatus (set to 'pending' in createExamResultDraft, before the
// upload) — only the Cloud Function moves it forward from there.
export async function attachExamResultFile(patientUid, doctorUid, examId, { attachmentUrl, attachmentFileName }) {
  const batch = writeBatch(db)
  const fields = { attachmentUrl, attachmentFileName }
  batch.set(doc(db, 'users', patientUid, 'exams', examId), fields, { merge: true })
  batch.set(doc(db, 'users', doctorUid, 'examReviews', examId), fields, { merge: true })
  await batch.commit()
}

export async function markExamResultUploadFailed(patientUid, doctorUid, examId) {
  const batch = writeBatch(db)
  const fields = { processingStatus: 'failed', processingError: 'upload_failed' }
  batch.set(doc(db, 'users', patientUid, 'exams', examId), fields, { merge: true })
  batch.set(doc(db, 'users', doctorUid, 'examReviews', examId), fields, { merge: true })
  await batch.commit()
}

export async function markExamReviewed(doctorUid, patientUid, examId) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', patientUid, 'exams', examId), { reviewStatus: 'reviewed' }, { merge: true })
  batch.set(doc(db, 'users', doctorUid, 'examReviews', examId), { reviewStatus: 'reviewed' }, { merge: true })
  await batch.commit()

  // Recompute the flag: does this patient still have any other pending review?
  const remaining = await getDocs(
    query(
      collection(db, 'users', doctorUid, 'examReviews'),
      where('patientUid', '==', patientUid),
      where('reviewStatus', '==', 'not_reviewed')
    )
  )
  await setDoc(
    doc(db, 'users', doctorUid, 'patients', patientUid),
    { hasPendingReview: remaining.size > 0 },
    { merge: true }
  )
}

export async function getDoctorExamReviews(doctorUid) {
  const q = query(collection(db, 'users', doctorUid, 'examReviews'), orderBy('submittedAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, submittedAt: data.submittedAt?.toDate?.() || null }
  })
}

// Live version — so ExamesPage reflects processingStatus changing in the
// background (the Cloud Function runs asynchronously, on its own schedule).
export function subscribeToDoctorExamReviews(doctorUid, callback, onError) {
  const q = query(collection(db, 'users', doctorUid, 'examReviews'), orderBy('submittedAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => {
        const data = d.data()
        return { id: d.id, ...data, submittedAt: data.submittedAt?.toDate?.() || null }
      })
    )
  }, onError)
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
