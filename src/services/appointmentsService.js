import { collection, doc, addDoc, updateDoc, onSnapshot, query, where, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

// Collection: appointments/{id}
// Fields: patientId, patientName, doctorId, doctorName, doctorSpecialty,
//         startsAt, durationMin, mode ('presencial' | 'telemedicina'),
//         location (address, or the call link), notes,
//         status ('scheduled' | 'confirmed' | 'reschedule_requested' | 'cancelled'),
//         rescheduleNote (patient's message), createdAt, updatedAt, respondedAt
//
// The doctor schedules, reschedules (back to 'scheduled') and cancels; the
// patient confirms or asks to reschedule — see firestore.rules.

// `tone` names a status style in src/components/uiHelpers.js (TONES).
export const APPOINTMENT_STATUS = {
  scheduled: { label: 'Aguardando confirmação', short: 'A confirmar', tone: 'warn' },
  confirmed: { label: 'Confirmada', short: 'Confirmada', tone: 'good' },
  reschedule_requested: { label: 'Pediu para remarcar', short: 'Remarcação', tone: 'alert' },
  cancelled: { label: 'Cancelada', short: 'Cancelada', tone: 'neutral' },
}

export const APPOINTMENT_MODES = {
  presencial: { label: 'Presencial' },
  telemedicina: { label: 'Telemedicina' },
}

function toAppointment(d) {
  const data = d.data()
  return { id: d.id, ...data, startsAt: data.startsAt?.toDate?.() || null }
}

const byStart = (a, b) => (a.startsAt?.getTime() ?? 0) - (b.startsAt?.getTime() ?? 0)

function subscribe(field, uid, callback, onError) {
  const q = query(collection(db, 'appointments'), where(field, '==', uid))
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map(toAppointment).sort(byStart)), onError)
}

export function subscribeToPatientAppointments(patientId, callback, onError) {
  return subscribe('patientId', patientId, callback, onError)
}

export function subscribeToDoctorAppointments(doctorId, callback, onError) {
  return subscribe('doctorId', doctorId, callback, onError)
}

// Not cancelled and not over yet (an appointment counts until it ends).
export function upcomingAppointments(appointments) {
  const now = Date.now()
  return appointments.filter((a) => a.status !== 'cancelled' && a.startsAt && a.startsAt.getTime() + (a.durationMin || 30) * 60000 > now)
}

export function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// "Hoje, 14:30", "Amanhã, 09:00", "qui., 16 de out., 14:30"
export function formatAppointmentDate(date) {
  if (!date) return ''
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)
  if (isSameDay(date, today)) return `Hoje, ${time}`
  if (isSameDay(date, tomorrow)) return `Amanhã, ${time}`
  return `${date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time}`
}

export async function createAppointment({ patientId, patientName, doctorId, doctorProfile, startsAt, durationMin, mode, location, notes }) {
  const now = Timestamp.now()
  const ref = await addDoc(collection(db, 'appointments'), {
    patientId,
    patientName: patientName || '',
    doctorId,
    doctorName: doctorProfile?.fullName || '',
    doctorSpecialty: doctorProfile?.specialty || '',
    startsAt: Timestamp.fromDate(startsAt),
    durationMin,
    mode,
    location: location || '',
    notes: notes || '',
    status: 'scheduled',
    rescheduleNote: '',
    createdAt: now,
    updatedAt: now,
  })
  return ref.id
}

// Doctor changes date/time/details; the patient confirms again.
export async function rescheduleAppointment(id, { startsAt, durationMin, mode, location, notes }) {
  await updateDoc(doc(db, 'appointments', id), {
    startsAt: Timestamp.fromDate(startsAt),
    durationMin,
    mode,
    location: location || '',
    notes: notes || '',
    status: 'scheduled',
    rescheduleNote: '',
    updatedAt: Timestamp.now(),
  })
}

export async function cancelAppointment(id) {
  await updateDoc(doc(db, 'appointments', id), { status: 'cancelled', updatedAt: Timestamp.now() })
}

export async function confirmAppointment(id) {
  await updateDoc(doc(db, 'appointments', id), { status: 'confirmed', respondedAt: Timestamp.now() })
}

export async function requestReschedule(id, note) {
  await updateDoc(doc(db, 'appointments', id), { status: 'reschedule_requested', rescheduleNote: note || '', respondedAt: Timestamp.now() })
}
