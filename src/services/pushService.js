import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging'
import { doc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore'
import { firebaseApp, db, useEmulators, VAPID_KEY } from '../firebase'

// Push notifications through Firebase Cloud Messaging. The token for this
// device is stored at deviceTokens/{token} = { userId, ... } and the Cloud
// Function (functions/notifications.js) pushes every new notification to
// the recipient's tokens. FCM isn't emulated, so push is off in emulator
// mode, and it stays off until a VAPID key is set in src/firebase.js.

const TOKEN_STORAGE_KEY = 'pushToken'
// Its own scope, so it doesn't clash with the PWA's service worker.
const SW_URL = '/firebase-messaging-sw.js'
const SW_SCOPE = '/firebase-cloud-messaging-push-scope'

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function storeToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Private mode: only the logout cleanup is lost.
  }
}

// { available, permission: 'default' | 'granted' | 'denied', needsInstall }
// needsInstall: iPhone/iPad only gets web push from the installed app.
export async function getPushStatus() {
  if (!VAPID_KEY || useEmulators || typeof Notification === 'undefined') {
    return { available: false, permission: 'denied', needsInstall: isIos() && !isStandalone() }
  }
  if (isIos() && !isStandalone()) return { available: false, permission: 'default', needsInstall: true }
  const supported = await isSupported().catch(() => false)
  return { available: supported, permission: Notification.permission, needsInstall: false }
}

async function registerToken(uid) {
  const registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE })
  const token = await getToken(getMessaging(firebaseApp), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration })
  if (!token) return null
  await setDoc(doc(db, 'deviceTokens', token), {
    userId: uid,
    userAgent: navigator.userAgent.slice(0, 200),
    updatedAt: Timestamp.now(),
  })
  storeToken(token)
  return token
}

// Asks for permission (must be called from a tap) and registers this device.
export async function enablePush(uid) {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false
  return Boolean(await registerToken(uid))
}

// On app start: refresh this device's token if permission was given before.
export async function refreshPushToken(uid) {
  const status = await getPushStatus()
  if (!status.available || status.permission !== 'granted') return
  await registerToken(uid).catch(() => {})
}

// Call BEFORE signing out (the rules need the user to delete the doc), so
// the next person on this device doesn't get the previous user's alerts.
export async function unregisterPush() {
  const token = readStoredToken()
  if (!token) return
  storeToken(null)
  await deleteDoc(doc(db, 'deviceTokens', token)).catch(() => {})
  if (await isSupported().catch(() => false)) {
    await deleteToken(getMessaging(firebaseApp)).catch(() => {})
  }
}

// Messages that arrive while the app is open (the system doesn't show them).
export async function onForegroundPush(callback) {
  const status = await getPushStatus()
  if (!status.available) return () => {}
  return onMessage(getMessaging(firebaseApp), (payload) => callback(payload.notification || {}))
}
