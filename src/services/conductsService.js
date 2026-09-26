import { collection, doc, addDoc, setDoc, getDocs, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
export { formatRelativeDate } from './dateUtils'

// Collection: users/{uid}/conducts/{conductId}
// Fields: title, why, timeframe ('agora' | 'proximos90' | 'esteAno' | 'longoPrazo'),
//         type ('medication' | 'diet' | 'exercise' | 'followup'), dueDate,
//         status ('pending' | 'done')
// Optional (set when a doctor attaches a prescription PDF):
//         doctorUid, doctorName, attachmentUrl, attachmentFileName
// Optional (set by the Cloud Function in functions/index.js once it
// processes the attached PDF — see storageService.uploadConductPrescriptionFile):
//         processingStatus ('pending' | 'processing' | 'completed' | 'failed'),
//         processingError, medications: [{ name, dosage, instructions }]

export async function getConducts(uid) {
  const q = query(collection(db, 'users', uid, 'conducts'), orderBy('dueDate', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return { id: d.id, ...data, dueDate: data.dueDate?.toDate?.() || null }
  })
}

// Live version — used where the UI should reflect processingStatus changing
// in the background (e.g. PlanPage), without the user needing to refresh.
export function subscribeToConducts(uid, callback, onError) {
  const q = query(collection(db, 'users', uid, 'conducts'), orderBy('dueDate', 'asc'))
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map((d) => {
        const data = d.data()
        return { id: d.id, ...data, dueDate: data.dueDate?.toDate?.() || null }
      })
    )
  }, onError)
}

export async function addConduct(uid, conduct) {
  const docRef = await addDoc(collection(db, 'users', uid, 'conducts'), {
    ...conduct,
    status: conduct.status || 'pending',
    dueDate: conduct.dueDate ? Timestamp.fromDate(conduct.dueDate) : null,
  })
  return docRef.id
}

export async function markConductDone(uid, conductId) {
  await setDoc(doc(db, 'users', uid, 'conducts', conductId), { status: 'done' }, { merge: true })
}

// Called after the PDF upload succeeds. Deliberately does NOT touch
// processingStatus: the doc is created with 'pending' *before* the upload,
// and from then on only the Cloud Function moves the status forward. If the
// client wrote a status here, it could land after the function had already
// finished and knock a 'completed' doc back to 'pending'.
export async function attachConductFile(uid, conductId, { attachmentUrl, attachmentFileName }) {
  await setDoc(doc(db, 'users', uid, 'conducts', conductId), { attachmentUrl, attachmentFileName }, { merge: true })
}

// The upload itself failed, so no file will ever reach the Cloud Function.
export async function markConductUploadFailed(uid, conductId) {
  await setDoc(
    doc(db, 'users', uid, 'conducts', conductId),
    { processingStatus: 'failed', processingError: 'upload_failed' },
    { merge: true }
  )
}

export function groupByTimeframe(conducts) {
  return conducts.reduce(
    (acc, c) => {
      const key = acc[c.timeframe] ? c.timeframe : 'agora'
      acc[key].push(c)
      return acc
    },
    { agora: [], proximos90: [], esteAno: [], longoPrazo: [] }
  )
}
