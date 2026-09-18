import { collection, doc, addDoc, setDoc, deleteDoc, getDocs, orderBy, query, where, writeBatch, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

// Collection: users/{uid}/careTeam/{memberId}
// Common fields: name, memberType ('doctor' | 'nurse' | 'family'), phone
// Doctor-only: specialty, crm, doctorUid (set when linked via search, see below)
// Nurse-only: specialty (e.g. "Enfermagem domiciliar")
// Family-only: relationship (e.g. "Filha", "Cônjuge")

export async function getCareTeam(uid) {
  const q = query(collection(db, 'users', uid, 'careTeam'), orderBy('name', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addCareTeamMember(uid, member) {
  const docRef = await addDoc(collection(db, 'users', uid, 'careTeam'), member)
  return docRef.id
}

export async function updateCareTeamMember(uid, memberId, updates) {
  await setDoc(doc(db, 'users', uid, 'careTeam', memberId), updates, { merge: true })
}

export async function removeCareTeamMember(uid, memberId) {
  await deleteDoc(doc(db, 'users', uid, 'careTeam', memberId))
}

// Groups a flat list into { doctor: [...], nurse: [...], family: [...] }
export function groupByMemberType(members) {
  return members.reduce(
    (acc, m) => {
      const key = acc[m.memberType] ? m.memberType : 'other'
      acc[key] = acc[key] || []
      acc[key].push(m)
      return acc
    },
    { doctor: [], nurse: [], family: [], other: [] }
  )
}

// --- Patient <-> Doctor linking (both are real users, found via search) ---
// This is a request/confirmation flow, not an instant link: whoever
// initiates writes status 'pending' to both sides, and the *other* party
// must call confirmLink before it becomes 'confirmed'. Using the other
// person's uid as the doc id keeps this idempotent — re-requesting the same
// pair just overwrites the same two documents.
//   users/{patientUid}/careTeam/{doctorUid}  -> shows up on the patient's Equipe médica
//   users/{doctorUid}/patients/{patientUid}  -> shows up on the doctor's patient list
// Both docs carry: status ('pending' | 'confirmed'), initiatedBy ('patient' | 'doctor')
export async function requestPatientDoctorLink({ patientUid, patientProfile, doctorUid, doctorProfile, initiatedBy }) {
  const batch = writeBatch(db)

  const careTeamRef = doc(db, 'users', patientUid, 'careTeam', doctorUid)
  batch.set(
    careTeamRef,
    {
      memberType: 'doctor',
      name: doctorProfile.fullName,
      specialty: doctorProfile.specialty || '',
      crm: doctorProfile.crm ? `CRM ${doctorProfile.crm}${doctorProfile.crmState ? '/' + doctorProfile.crmState : ''}` : '',
      doctorUid,
      status: 'pending',
      initiatedBy,
    },
    { merge: true }
  )

  const patientRef = doc(db, 'users', doctorUid, 'patients', patientUid)
  batch.set(
    patientRef,
    {
      name: patientProfile.fullName,
      patientUid,
      status: 'pending',
      initiatedBy,
    },
    { merge: true }
  )

  await batch.commit()
}

// Called by whichever side did NOT initiate the request.
export async function confirmPatientDoctorLink(patientUid, doctorUid) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'users', patientUid, 'careTeam', doctorUid), { status: 'confirmed' }, { merge: true })
  batch.set(doc(db, 'users', doctorUid, 'patients', patientUid), { status: 'confirmed' }, { merge: true })
  await batch.commit()
}

export async function declinePatientDoctorLink(patientUid, doctorUid) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'users', patientUid, 'careTeam', doctorUid))
  batch.delete(doc(db, 'users', doctorUid, 'patients', patientUid))
  await batch.commit()
}

export async function unlinkPatientAndDoctor(patientUid, doctorUid) {
  return declinePatientDoctorLink(patientUid, doctorUid)
}

export async function getDoctorPatients(doctorUid) {
  const q = query(collection(db, 'users', doctorUid, 'patients'), orderBy('name', 'asc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// --- Real-time pending-request counts, for notification badges ---
// "Incoming" means the request needs *this* person's confirmation — i.e.
// it was initiated by the other party. Used to badge the bell icon and the
// Equipe médica / Pacientes bottom-nav tabs live, without polling.

export function subscribeToIncomingRequestsForPatient(patientUid, callback) {
  const q = query(
    collection(db, 'users', patientUid, 'careTeam'),
    where('status', '==', 'pending'),
    where('initiatedBy', '==', 'doctor')
  )
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))))
}

export function subscribeToIncomingRequestsForDoctor(doctorUid, callback) {
  const q = query(
    collection(db, 'users', doctorUid, 'patients'),
    where('status', '==', 'pending'),
    where('initiatedBy', '==', 'patient')
  )
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))))
}
