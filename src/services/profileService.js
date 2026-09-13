import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Profiles live in a single "users" collection, keyed by Firebase Auth uid.
// The `role` field ('patient' | 'doctor') determines which extra fields apply
// — see CompleteProfilePage for the full field list per role.
export async function saveUserProfile(uid, profileData) {
  await setDoc(doc(db, 'users', uid), profileData, { merge: true })
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid))
  return snapshot.exists() ? snapshot.data() : null
}
