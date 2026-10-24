import { collection, doc, onSnapshot, query, where, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

// Collection: notifications/{id} — written only by the Cloud Functions
// (functions/notifications.js).
// Fields: recipientId, type, title, body, actorName, read, createdAt,
//         target: { kind: 'exam' | 'conduct', id, patientId }
// type: 'exam_requested' | 'conduct_created' | 'result_read' | 'result_failed'
//       | 'result_reviewed' (patient) — 'result_submitted' | 'result_attention' (doctor)

// Only the newest are shown; older ones stay in Firestore.
const MAX_SHOWN = 60

function toNotification(d) {
  const data = d.data()
  return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() || new Date() }
}

// Live, newest first. Sorted in memory so the query stays equality-only
// (see careTeamService).
export function subscribeToNotifications(uid, callback, onError) {
  const q = query(collection(db, 'notifications'), where('recipientId', '==', uid))
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(toNotification).sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_SHOWN)),
    onError
  )
}

export async function markNotificationRead(id) {
  await updateDoc(doc(db, 'notifications', id), { read: true })
}

export async function markAllNotificationsRead(notifications) {
  const unread = notifications.filter((n) => !n.read)
  if (unread.length === 0) return
  const batch = writeBatch(db)
  unread.forEach((n) => batch.update(doc(db, 'notifications', n.id), { read: true }))
  await batch.commit()
}
