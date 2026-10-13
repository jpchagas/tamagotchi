import { collection, doc, addDoc, setDoc, deleteDoc, getDocs, query, where, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../firebase'

// --- Patient <-> Doctor links ---
// Collection: careLinks/{patientId}_{doctorId}
// Fields: patientId, doctorId, status ('pending' | 'confirmed'),
//         initiatedBy ('patient' | 'doctor'), createdAt, confirmedAt,
//         plus display copies of the names so lists don't need a profile read
//         per row: patientName, doctorName, doctorSpecialty, doctorCrm
//
// This is a request/confirmation flow: whoever initiates writes 'pending',
// and the *other* party confirms. The deterministic id keeps it idempotent —
// re-requesting the same pair just overwrites the same document.

export function careLinkId(patientId, doctorId) {
  return `${patientId}_${doctorId}`
}

function formatCrm(profile) {
  if (!profile.crm) return ''
  return `CRM ${profile.crm}${profile.crmState ? '/' + profile.crmState : ''}`
}

export async function requestPatientDoctorLink({ patientUid, patientProfile, doctorUid, doctorProfile, initiatedBy }) {
  await setDoc(
    doc(db, 'careLinks', careLinkId(patientUid, doctorUid)),
    {
      patientId: patientUid,
      doctorId: doctorUid,
      patientName: patientProfile.fullName || '',
      doctorName: doctorProfile.fullName || '',
      doctorSpecialty: doctorProfile.specialty || '',
      doctorCrm: formatCrm(doctorProfile),
      status: 'pending',
      initiatedBy,
      createdAt: Timestamp.now(),
    },
    { merge: true }
  )
}

// Called by whichever side did NOT initiate the request.
export async function confirmPatientDoctorLink(patientUid, doctorUid) {
  await setDoc(
    doc(db, 'careLinks', careLinkId(patientUid, doctorUid)),
    { status: 'confirmed', confirmedAt: Timestamp.now() },
    { merge: true }
  )
}

export async function declinePatientDoctorLink(patientUid, doctorUid) {
  await deleteDoc(doc(db, 'careLinks', careLinkId(patientUid, doctorUid)))
}

export async function unlinkPatientAndDoctor(patientUid, doctorUid) {
  return declinePatientDoctorLink(patientUid, doctorUid)
}

const byName = (field) => (a, b) => (a[field] || '').localeCompare(b[field] || '')

// Queries in this app filter on equality only and sort in memory, so
// Firestore can serve them from its automatic single-field indexes (no
// composite index definitions to deploy).
export async function getPatientCareLinks(patientId) {
  const snapshot = await getDocs(query(collection(db, 'careLinks'), where('patientId', '==', patientId)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byName('doctorName'))
}

export async function getDoctorPatients(doctorId) {
  const snapshot = await getDocs(query(collection(db, 'careLinks'), where('doctorId', '==', doctorId)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byName('patientName'))
}

// --- Real-time pending-request counts, for notification badges ---
// "Incoming" means the request needs *this* person's confirmation — i.e.
// it was initiated by the other party.

export function subscribeToIncomingRequestsForPatient(patientId, callback) {
  const q = query(
    collection(db, 'careLinks'),
    where('patientId', '==', patientId),
    where('status', '==', 'pending'),
    where('initiatedBy', '==', 'doctor')
  )
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export function subscribeToIncomingRequestsForDoctor(doctorId, callback) {
  const q = query(
    collection(db, 'careLinks'),
    where('doctorId', '==', doctorId),
    where('status', '==', 'pending'),
    where('initiatedBy', '==', 'patient')
  )
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

// --- Care contacts that are not app users (nurses, family) ---
// Collection: careContacts/{contactId}
// Fields: patientId, name, memberType ('nurse' | 'family'), phone,
//         specialty (nurse, e.g. "Enfermagem domiciliar"),
//         relationship (family, e.g. "Filha")

export async function getCareContacts(patientId) {
  const snapshot = await getDocs(query(collection(db, 'careContacts'), where('patientId', '==', patientId)))
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byName('name'))
}

export async function addCareContact(patientId, contact) {
  const docRef = await addDoc(collection(db, 'careContacts'), { ...contact, patientId })
  return docRef.id
}

export async function removeCareContact(contactId) {
  await deleteDoc(doc(db, 'careContacts', contactId))
}
