// Shows push notifications while the app is closed or in the background.
// Registered by src/services/pushService.js under its own scope, so it
// doesn't clash with the PWA service worker. Notifications sent with a
// `notification` payload (functions/notifications.js) are displayed by the
// Firebase SDK itself; tapping one opens the app (webpush.fcmOptions.link).
// Keep the version in step with the `firebase` package.
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js')

// Same public config as src/firebase.js.
firebase.initializeApp({
  apiKey: 'AIzaSyA93sIiGzQNG2DoZu1H_SOQp7EV_DApJjU',
  authDomain: 'tamagotchi-459a6.firebaseapp.com',
  projectId: 'tamagotchi-459a6',
  storageBucket: 'tamagotchi-459a6.firebasestorage.app',
  messagingSenderId: '312283992743',
  appId: '1:312283992743:web:2b77ee85147fc51562c182',
})

firebase.messaging()
