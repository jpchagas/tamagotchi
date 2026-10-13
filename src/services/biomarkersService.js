import { collection, doc, addDoc, getDocs, setDoc, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

// --- Biomarker types (global, shared across all patients) ---
// Collection: biomarkerTypes/{key}   e.g. ldl, hdl, sbp, egfr, glicose
// Fields: label, unit, goodDirection ('down' | 'up', optional — which way
//         is an improvement; missing for types the extraction created)

export async function getBiomarkerTypes() {
  const snapshot = await getDocs(collection(db, 'biomarkerTypes'))
  return Object.fromEntries(snapshot.docs.map((d) => [d.id, { key: d.id, ...d.data() }]))
}

export async function saveBiomarkerType(key, { label, unit, goodDirection }) {
  await setDoc(doc(db, 'biomarkerTypes', key), { label, unit, ...(goodDirection && { goodDirection }) }, { merge: true })
}

// --- Biomarkers (one measurement per doc) ---
// Collection: biomarkers/{id}
// Fields: patientId, biomarkerType (a biomarkerTypes key), value, unit,
//         recordedAt, source ('exam' | 'manual'),
//         examId (when source is 'exam'; the Cloud Function writes these
//         with id `{examId}_{i}`)

export async function addBiomarker(patientId, { biomarkerType, value, unit = '', recordedAt = new Date(), source = 'manual' }) {
  await addDoc(collection(db, 'biomarkers'), {
    patientId,
    biomarkerType,
    value,
    unit,
    recordedAt: Timestamp.fromDate(recordedAt),
    source,
  })
}

// All of a patient's biomarkers grouped by type, oldest first within each
// group — ready for a sparkline. One query instead of one per type, sorted
// in memory so it stays equality-only (see careTeamService).
export async function getBiomarkersGrouped(patientId) {
  const snapshot = await getDocs(query(collection(db, 'biomarkers'), where('patientId', '==', patientId)))

  const grouped = {}
  snapshot.docs.forEach((d) => {
    const data = d.data()
    if (!grouped[data.biomarkerType]) grouped[data.biomarkerType] = []
    grouped[data.biomarkerType].push({ id: d.id, value: data.value, unit: data.unit, recordedAt: data.recordedAt.toDate() })
  })
  Object.values(grouped).forEach((list) => list.sort((a, b) => a.recordedAt - b.recordedAt))
  return grouped
}

// Latest value and the one before it, for computing a delta.
export function getLatestAndPrevious(readings) {
  if (!readings || readings.length === 0) return { latest: null, previous: null }
  const latest = readings[readings.length - 1]
  const previous = readings.length > 1 ? readings[readings.length - 2] : null
  return { latest, previous }
}

// Change between the last two readings. `improving` is null when the type
// has no goodDirection, so the UI can show the change without judging it.
export function computeChange(readings, goodDirection) {
  const { latest, previous } = getLatestAndPrevious(readings)
  if (!latest || !previous) return null
  const diff = latest.value - previous.value
  const percent = previous.value !== 0 ? (diff / previous.value) * 100 : 0
  const direction = diff < 0 ? 'down' : diff > 0 ? 'up' : 'flat'
  const improving = !goodDirection || direction === 'flat' ? null : direction === goodDirection
  return { diff, percent, direction, improving, latest }
}
