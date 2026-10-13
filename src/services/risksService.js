import { collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

// Collection: risks/{riskId} — one doc per calculation, so the history of a
// risk over time is kept.
// Fields: patientId, riskType (a RISK_TYPES key), calculatedAt,
//         value (number, % probability — optional, some models only give a category),
//         category ('baixo' | 'moderado' | 'alto'),
//         model (e.g. 'PREVENT', 'Framingham'), horizonYears (optional, e.g. 10),
//         inputs (optional, { [biomarkerType]: value } — the values the model used)
//
// Nothing in the app calculates risks yet: they are written by the seed
// script for now, and later by the calculators.

export const RISK_TYPES = {
  cardiovascular: { label: 'Cardiovascular' },
  diabetes: { label: 'Diabetes' },
  metabolico: { label: 'Metabólico' },
  oncologico: { label: 'Oncológico' },
  cerebral: { label: 'Cérebro' },
}

export const RISK_CATEGORIES = {
  baixo: { label: 'Baixo', color: '#3ba55c', bg: '#e6f5ea' },
  moderado: { label: 'Moderado', color: '#e08a3c', bg: '#fdf1e6' },
  alto: { label: 'Alto', color: '#d64545', bg: '#fdeceb' },
}

export function riskTypeLabel(riskType) {
  return RISK_TYPES[riskType]?.label || riskType
}

// "Alto · 12%" or just "Alto" when the model gives no percentage.
export function formatRiskValue(risk) {
  const category = RISK_CATEGORIES[risk.category]?.label || risk.category || ''
  const value = typeof risk.value === 'number' ? `${risk.value.toLocaleString('pt-BR')}%` : null
  return [category, value].filter(Boolean).join(' · ')
}

function toRisk(d) {
  const data = d.data()
  return { id: d.id, ...data, calculatedAt: data.calculatedAt?.toDate?.() || null }
}

const newestFirst = (a, b) => (b.calculatedAt?.getTime() ?? 0) - (a.calculatedAt?.getTime() ?? 0)

// Keeps only the most recent calculation for each (patient, riskType).
function latestPerType(risks) {
  const seen = new Set()
  return [...risks].sort(newestFirst).filter((r) => {
    const key = `${r.patientId}|${r.riskType}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

async function getPatientRisks(patientId) {
  const snapshot = await getDocs(query(collection(db, 'risks'), where('patientId', '==', patientId)))
  return snapshot.docs.map(toRisk)
}

// Current risk per type, in RISK_TYPES order.
export async function getLatestRisks(patientId) {
  const order = Object.keys(RISK_TYPES)
  return latestPerType(await getPatientRisks(patientId)).sort(
    (a, b) => order.indexOf(a.riskType) - order.indexOf(b.riskType)
  )
}

// Every calculation of one risk type, newest first.
export async function getRiskHistory(patientId, riskType) {
  return (await getPatientRisks(patientId)).filter((r) => r.riskType === riskType).sort(newestFirst)
}

// Current risks across many patients (doctor dashboard). One equality query
// per patient rather than one `in` query: the security rules authorize a
// doctor per patient (through careLinks), which they can check against a
// single patientId but not against a list.
export async function getLatestRisksForPatients(patientIds) {
  const perPatient = await Promise.all(patientIds.map(getPatientRisks))
  return latestPerType(perPatient.flat())
}

export async function addRisk(patientId, { riskType, value = null, category, model, horizonYears = null, inputs = null, calculatedAt = new Date() }) {
  const docRef = await addDoc(collection(db, 'risks'), {
    patientId,
    riskType,
    value,
    category,
    model,
    horizonYears,
    inputs,
    calculatedAt: Timestamp.fromDate(calculatedAt),
  })
  return docRef.id
}
