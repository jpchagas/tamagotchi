import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth } from '../firebase'

const googleProvider = new GoogleAuthProvider()
const appleProvider = new OAuthProvider('apple.com')

// Firebase's identifier field is always email, so "E-mail ou CPF" on the
// login screen needs the CPF-to-email lookup handled server-side (e.g. a
// Cloud Function) before calling this — this function expects a real email.
export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password)
  return credential.user
}

export async function registerWithEmail({ fullName, email, password }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(credential.user, { displayName: fullName })
  return credential.user
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider)
  return credential.user
}

export async function loginWithApple() {
  const credential = await signInWithPopup(auth, appleProvider)
  return credential.user
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email)
}

export async function logout() {
  await signOut(auth)
}

// Subscribes to auth state; calls callback(user) on every change, including
// on initial load. Returns the unsubscribe function.
export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback)
}
