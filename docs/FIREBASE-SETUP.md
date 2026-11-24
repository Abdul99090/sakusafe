# Firebase setup — from clone to live URL (≈10 minutes)

SakuSafe ships in **demo mode**: with no Firebase config it runs fully on a
built-in local heuristic engine and every result is labeled "Demo engine".
Follow these steps once to connect the real **Firebase AI Logic** routes
(on-device Gemini Nano + cloud Gemini) and publish the live judging URL.

All steps use the Google account that should own the project.

## 1. Create the Firebase project
1. Open https://console.firebase.google.com → **Add project**.
2. Name it `sakusafe` (or accept the suggested project ID — note it down).
3. Google Analytics: optional; can be disabled for a faster setup.
4. Wait for project creation → **Continue**.

## 2. Register the web app
1. On the project overview, click the **Web** icon (`</>`) to add an app.
2. App nickname: `sakusafe-web`. Tick **"Also set up Firebase Hosting"**.
3. **Register app** → copy the `firebaseConfig` object shown.
4. Paste it into `public/js/firebase-config.js` (replace every `YOUR_*` value)
   and put the project ID into `.firebaserc`.

## 3. Enable Firebase AI Logic (this is the core requirement)
1. In the Firebase Console left menu: **Build → AI Logic** (a.k.a. Gemini in Firebase).
2. Click **Get started** → choose the **Gemini Developer API** (free Spark-tier
   path is fine for judging) → **Enable**.
3. (Recommended) In the same AI Logic page, review the default safety settings;
   SakuSafe additionally sets per-request safety thresholds in `public/js/ai.js`.
4. (Recommended, for production) Enable **Firebase App Check** with reCAPTCHA
   Enterprise for the web app, so the AI quota can only be spent from this site.

## 4. (Optional) On-device Gemini Nano notes
- The on-device route uses Chrome's built-in Gemini Nano through Firebase AI
  Logic's `InferenceMode.ONLY_ON_DEVICE`. It needs a recent desktop Chrome
  with Gemini Nano downloaded (chrome://components → "Optimization Guide
  On Device Model"). SakuSafe probes availability at runtime and degrades
  gracefully — no judge is ever blocked by a missing local model.
- Cloud fallback requires no extra setup beyond step 3.

## 5. Deploy to Firebase Hosting (the live URL)
```bash
npm install -g firebase-tools   # once
firebase login                  # the project owner's Google account
firebase deploy --only hosting
```
The CLI prints the live URL: `https://<project-id>.web.app` — that is the URL
to paste into the Devpost submission ("URL to the project for judging/testing").

## 6. Verify
1. Open the live URL. The header badge should read
   "☁️ Cloud route via Firebase AI Logic" (or "⚡ Gemini Nano available…" in
   a Nano-capable Chrome).
2. Load the **Crypto giveaway** sample → **Deep audit** → the result badge
   must say "Gemini 2.5 Flash · cloud via Firebase AI Logic".
3. In a Nano-capable Chrome, run **Instant scan** → badge must say
   "Gemini Nano · on-device via Firebase AI Logic".

## Troubleshooting
- Badge still says "Demo mode" → `firebase-config.js` still contains `YOUR_*`
  placeholders, or the deploy predates your edit (redeploy).
- Cloud call fails with a quota/permission error → AI Logic (step 3) is not
  enabled for this project, or the Gemini API is not enabled in the linked
  Google Cloud project.
- On-device fails on a machine that "has Nano" → check
  `chrome://on-device-internals` and that the site is served over HTTPS
  (Hosting is HTTPS by default).
