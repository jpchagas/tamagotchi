import { collection, doc, setDoc, getDocs, query, where, orderBy, Timestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

// A patient submitting an exam result writes to two places in one batch,
// same pattern as careTeamService's patient<->doctor linking:
//   users/{patientUid}/exams/{examId}         -> the exam itself (shows in patient's Agenda)
//   users/{doctorUid}/examReviews/{examId}    -> a lightweight pointer so the doctor
//                                                can list pending reviews across ALL
//                                                their patients without a collectionGroup query
// Both copies carry reviewStatus ('not_reviewed' | 'reviewed') and category
// ('laboratorial' | 'imagem' | 'documento'), kept in sync by markExamReviewed.
// The same examId is used in both places.
//
// users/{doctorUid}/patients/{patientUid} also gets a denormalized
// hasPendingReview flag, updated here, so the Pacientes list can show an
// alert indicator without querying exams per-patient on every render.

export async function submitExamResult({
  patientUid, patientProfile, doctorUid, doctorName, title, category, attachmentUrl, attachmentFileName,
}) {
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
    attachmentUrl,
    attachmentFileName,
    reviewStatus: 'not_reviewed',
  })

  const reviewRef = doc(db, 'users', doctorUid, 'examReviews', examId)
  batch.set(reviewRef, {
    examId,
    patientUid,
    patientName: patientProfile?.fullName || '',
    title,
    category: category || 'documento',
    attachmentUrl,
    attachmentFileName,
    reviewStatus: 'not_reviewed',
    submittedAt,
  })

  batch.set(doc(db, 'users', doctorUid, 'patients', patientUid), { hasPendingReview: true }, { merge: true })

  await batch.commit()
  return examId
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
