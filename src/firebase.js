import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

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

export const firebaseApp = initializeApp(firebaseConfig)
export const auth = getAuth(firebaseApp)
export const db = getFirestore(firebaseApp)
