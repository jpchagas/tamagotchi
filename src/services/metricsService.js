import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

// --- Metric definitions (global, shared across all patients) ---
// Collection: metrics/{metricKey} -> { label, unit }

export async function getMetricDefinitions() {
  const snapshot = await getDocs(collection(db, 'metrics'))
  return snapshot.docs.map((d) => ({ key: d.id, ...d.data() }))
}

export async function ensureMetricDefinition(key, { label, unit }) {
  await setDoc(doc(db, 'metrics', key), { label, unit }, { merge: true })
}

// --- Metric readings (per patient, time series) ---
// Collection: users/{uid}/metricReadings/{readingId} -> { metricKey, value, recordedAt }

export async function addMetricReading(uid, metricKey, value, recordedAt = new Date()) {
  await addDoc(collection(db, 'users', uid, 'metricReadings'), {
    metricKey,
    value,
    recordedAt: Timestamp.fromDate(recordedAt),
  })
}

// Returns readings for a single metric, oldest first — ready for a sparkline.
export async function getMetricReadings(uid, metricKey) {
  const q = query(
    collection(db, 'users', uid, 'metricReadings'),
    where('metricKey', '==', metricKey),
    orderBy('recordedAt', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => {
    const data = d.data()
    return { id: d.id, value: data.value, recordedAt: data.recordedAt.toDate() }
  })
}

// Fetches all readings for a patient, grouped by metric key, oldest first
// within each group. One round trip instead of one query per metric.
export async function getAllMetricReadingsGrouped(uid) {
  const q = query(collection(db, 'users', uid, 'metricReadings'), orderBy('recordedAt', 'asc'))
  const snapshot = await getDocs(q)

  const grouped = {}
  snapshot.docs.forEach((d) => {
    const data = d.data()
    if (!grouped[data.metricKey]) grouped[data.metricKey] = []
    grouped[data.metricKey].push({ id: d.id, value: data.value, recordedAt: data.recordedAt.toDate() })
  })
  return grouped
}

// Convenience: latest value and the one before it, for computing a delta
// like the "O que mudou" cards on the Saúde screen.
export function getLatestAndPrevious(readings) {
  if (!readings || readings.length === 0) return { latest: null, previous: null }
  const latest = readings[readings.length - 1]
  const previous = readings.length > 1 ? readings[readings.length - 2] : null
  return { latest, previous }
}
