import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

// NOTE: this fetches every user with the given role and lets the UI filter
// client-side (fine for a small directory). Once the number of doctors or
// patients grows large, replace this with a real search service (Algolia,
// Typesense) or a Firestore prefix-range query on a lowercase name field —
// Firestore has no native full-text/substring search.

async function listUsersByRole(role) {
  const q = query(collection(db, 'users'), where('role', '==', role))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }))
}

export function listDoctors() {
  return listUsersByRole('doctor')
}

export function listPatients() {
  return listUsersByRole('patient')
}
