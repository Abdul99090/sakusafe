// SakuSafe — Firebase project configuration.
//
// SETUP: replace the values below with your own Firebase project's web config
// (Firebase Console → Project settings → General → "Your apps" → Web app).
// These values are NOT secret keys — a Firebase web config is a public project
// identifier. Access is controlled by Firebase AI Logic / App Check and your
// Google Cloud API restrictions, not by hiding this object.
//
// Until this file is filled in, SakuSafe automatically runs in DEMO MODE:
// the full UI and routing flow work, and analysis is produced by the built-in
// local heuristic engine (js/analyzer.js) so the app can be explored anywhere.
// See docs/FIREBASE-SETUP.md for the exact 10-minute setup click-list.

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}
