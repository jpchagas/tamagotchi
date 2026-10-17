import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

// Values come from your Firebase project settings (Project settings > General > Your apps).
// Store them in a .env file at the project root (never commit real keys):
//
// VITE_FIREBASE_API_KEY=...
// VITE_FIREBASE_AUTH_DOMAIN=...
// VITE_FIREBASE_PROJECT_ID=...
// VITE_FIREBASE_STORAGE_BUCKET=...
// VITE_FIREBASE_MESSAGING_SENDER_ID=...
// VITE_FIREBASE_APP_ID=...
const firebaseConfig = {
  apiKey: "AIzaSyA93sIiGzQNG2DoZu1H_SOQp7EV_DApJjU",
  authDomain: "tamagotchi-459a6.firebaseapp.com",
  projectId: "tamagotchi-459a6",
  storageBucket: "tamagotchi-459a6.firebasestorage.app",
  messagingSenderId: "312283992743",
  appId: "1:312283992743:web:2b77ee85147fc51562c182"
}

// `npm run dev:emulators` points the app at the local emulators
// (`npm run emulators` in functions/). The project id must match the one
// the emulators run with, or the app and the Cloud Function would see
// different databases.
export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'
const EMULATOR_PROJECT_ID = 'demo-tamagotchi'

export const firebaseApp = initializeApp(
  useEmulators
    ? { ...firebaseConfig, projectId: EMULATOR_PROJECT_ID, storageBucket: `${EMULATOR_PROJECT_ID}.appspot.com` }
    : firebaseConfig
)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
export const storage = getStorage(firebaseApp)

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}

// Web Push public key (Firebase console > Project settings > Cloud Messaging >
// Web Push certificates). Public by design. Empty = push turned off.
export const VAPID_KEY = ''
