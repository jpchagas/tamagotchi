import { collection, doc, addDoc, setDoc, getDocs, onSnapshot, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'
export { formatRelativeDate } from './dateUtils'

// Collection: conducts/{conductId}
// Fields: patientId, title, why, timeframe ('agora' | 'proximos90' | 'esteAno' | 'longoPrazo'),
//         type ('medication' | 'diet' | 'exercise' | 'followup'), dueDate,
//         status ('pending' | 'done')
// Optional (set when a doctor attaches a prescription PDF):
//         doctorId, doctorName, attachmentUrl, attachmentFileName
// Optional (set by the Cloud Function in functions/index.js once it
// processes the attached PDF — see storageService.uploadConductPrescriptionFile):
//         processingStatus ('pending' | 'processing' | 'completed' | 'failed'),
//         processingError, medications: [{ name, dosage, instructions }]

function toConduct(d) {
  const data = d.data()
  return { id: d.id, ...data, dueDate: data.dueDate?.toDate?.() || null }
}

// Sorted in memory (soonest first, undated last) so the query stays
// equality-only — see careTeamService.
function sortByDueDate(conducts) {
  return conducts.sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity))
}

function patientConductsQuery(patientId) {
  return query(collection(db, 'conducts'), where('patientId', '==', patientId))
}

export async function getConducts(patientId) {
  const snapshot = await getDocs(patientConductsQuery(patientId))
  return sortByDueDate(snapshot.docs.map(toConduct))
}

// Live version — used where the UI should reflect processingStatus changing
// in the background (e.g. PlanPage), without the user needing to refresh.
export function subscribeToConducts(patientId, callback, onError) {
  return onSnapshot(
    patientConductsQuery(patientId),
    (snapshot) => callback(sortByDueDate(snapshot.docs.map(toConduct))),
    onError
  )
}

// The next thing the patient should do: earliest pending conduct.
export function getNextPendingConduct(conducts) {
  return conducts.find((c) => c.status !== 'done') || null
}

export async function addConduct(patientId, conduct) {
  const docRef = await addDoc(collection(db, 'conducts'), {
    ...conduct,
    patientId,
    status: conduct.status || 'pending',
    dueDate: conduct.dueDate ? Timestamp.fromDate(conduct.dueDate) : null,
  })
  return docRef.id
}

export async function markConductDone(conductId) {
  await setDoc(doc(db, 'conducts', conductId), { status: 'done' }, { merge: true })
}

// Called after the PDF upload succeeds. Deliberately does NOT touch
// processingStatus: the doc is created with 'pending' *before* the upload,
// and from then on only the Cloud Function moves the status forward. If the
// client wrote a status here, it could land after the function had already
// finished and knock a 'completed' doc back to 'pending'.
export async function attachConductFile(conductId, { attachmentUrl, attachmentFileName }) {
  await setDoc(doc(db, 'conducts', conductId), { attachmentUrl, attachmentFileName }, { merge: true })
}

// The upload itself failed, so no file will ever reach the Cloud Function.
export async function markConductUploadFailed(conductId) {
  await setDoc(
    doc(db, 'conducts', conductId),
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
