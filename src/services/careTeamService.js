import { collection, doc, addDoc, setDoc, deleteDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

// Collection: users/{uid}/careTeam/{memberId}
// Common fields: name, memberType ('doctor' | 'nurse' | 'family'), phone
// Doctor-only: specialty, crm
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
