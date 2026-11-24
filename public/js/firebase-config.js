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
  apiKey: "AIzaSyDudYF82YowXRRV-mpOCtVounYIVvwo_1Q",
  authDomain: "sakusafe.firebaseapp.com",
  projectId: "sakusafe",
  storageBucket: "sakusafe.firebasestorage.app",
  messagingSenderId: "712385748377",
  appId: "1:712385748377:web:f8f21e03255585edaa8708",
};

// Firebase App Check site key (reCAPTCHA v3) — public by design; enforcement
// lives server-side. Firebase AI Logic enforces App Check for this project,
// so live AI calls are rejected until a real key is in place. While this is a
// placeholder the app skips App Check init and live AI calls are rejected by
// enforcement, so results fall back to the honestly-labelled demo engine.
export const APP_CHECK_SITE_KEY = "RECAPTCHA_V3_SITE_KEY_PLACEHOLDER";

export function isAppCheckConfigured() {
  return APP_CHECK_SITE_KEY !== "RECAPTCHA_V3_SITE_KEY_PLACEHOLDER";
}

export function isFirebaseConfigured() {
  return (
    firebaseConfig.apiKey !== "YOUR_API_KEY" &&
    firebaseConfig.projectId !== "YOUR_PROJECT_ID"
  );
}
