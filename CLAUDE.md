# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Despite the name "Tamagotchi", this is a Brazilian patient/doctor health-tracking PWA (UI strings, Firestore field values and Gemini prompts are in Portuguese). It is a React 19 + Vite + MUI app hosted on Firebase (Auth, Firestore, Storage, Hosting), plus one Cloud Function that uses Gemini to extract structured data from uploaded medical documents.

Brand palette (also in the PWA manifest in `vite.config.js`): `#dcbced`, `#bc9dda`, `#b597d2`, `#634879` (primary). Styling is inline MUI `sx` with hard-coded hex values. There is no MUI theme.

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # production build -> dist/ (also generates the PWA service worker)
npm run lint       # ESLint over the repo
npm run preview    # serve the built dist/

# Cloud Function (functions/, CommonJS, Node 20). Install deps separately: cd functions && npm install
firebase deploy --only hosting      # deploys dist/ (build first)
firebase deploy --only functions    # needs GEMINI_API_KEY secret; optional EXTRACTION_MODEL in functions/.env
```

There is no test suite. The Firebase config is hard-coded in `src/firebase.js`, so no `.env` is needed for the client. Firestore and Storage security rules are not in this repo.

## Architecture

**No router.** `react-router-dom` is installed but not used. `src/App.jsx` is a state machine: `splash → login → [forgotPassword | createAccount → selectProfile → completeProfile] → app`. Auth state comes from `subscribeToAuthChanges`. A user without a `users/{uid}` profile doc is sent to `selectProfile`. In the app, `role` picks `PatientApp` or `DoctorApp`, and each one switches screens with a `section` string and a bottom nav (`src/pages/AppBottomNav.jsx`, `src/doctor/DoctorBottomNav.jsx`). Sub-screens (e.g. `MetricPage`, `SubmitExamResultPage`) are shown by early-returning on local state, not by routing.

**Layout:** `src/components/` holds the auth/onboarding screens and shared UI, `src/pages/` the patient screens and `src/doctor/` the doctor screens. `src/services/` holds all Firestore/Storage access. Components never call Firestore directly; add new data access to a service.

**Firestore data model.** Almost everything lives under `users/{uid}`:
- `users/{uid}`: the profile, with `role: 'patient' | 'doctor'`
- patient subcollections: `careTeam`, `exams`, `conducts` (prescriptions), `metricReadings`
- doctor subcollections: `patients`, `examReviews`
- `metrics/{metricKey}`: global metric definitions `{label, unit}`, shared by all patients

**Cross-user writes are mirrored with batches.** No collectionGroup queries are used. Data that both sides need is written to both users' trees in one `writeBatch`:
- Patient↔doctor linking (`careTeamService.js`): `users/{patient}/careTeam/{doctorUid}` and `users/{doctor}/patients/{patientUid}`, each with `status: 'pending' | 'confirmed'` and `initiatedBy`. The side that did not initiate confirms. Using the other person's uid as the doc id makes these writes idempotent.
- Exam results (`examReviewService.js`): `users/{patient}/exams/{examId}` is mirrored to `users/{doctor}/examReviews/{examId}` (same id), and `hasPendingReview` is denormalized onto the doctor's `patients/{patientUid}` doc. Any status change must update every copy.

**Document upload → AI extraction pipeline** (`storageService.js` + `functions/index.js`):
1. The client creates the Firestore doc first, with `processingStatus: 'pending'`, so a real id exists.
2. The client uploads to a path that includes that id: `users/{patientUid}/conducts/{id}/prescription-*`, `users/{patientUid}/exams/{id}/request-*` or `users/{patientUid}/exams/{id}/result-*`.
3. `processUploadedFile` (Storage `onObjectFinalized`) matches the path against `ROUTES`, sets `processing`, sends the file inline to Gemini with a structured-output schema, then merges `medications` / `requestedExams` / `extractedValues` and sets `processingStatus: 'completed' | 'failed'` with a short `processingError` code. For exam results it also mirrors the fields to the doctor's `examReviews` copy and writes `metricReadings` (doc ids `{examId}_{i}`, previous readings for the exam deleted first, because trigger delivery can repeat) and creates missing `metrics` definitions.

The client must never set `processingStatus` past `pending`, except `markExamResultUploadFailed`; only the function advances it. The storage path prefixes and the `ROUTES` regexes must stay in sync. `src/components/DocumentProcessing.jsx` renders status chips and extracted data, and maps the `processingError` codes to messages, for both patient and doctor screens.

**Demo data:** `src/services/seedDemoData.js` seeds a user from the browser console (`seedAllDemoData(uid)`).

`WelcomePage.jsx`, `ProntuarioPage.jsx` and `hooks/usePet.js` are leftovers from the original pet-app scaffold and are not imported anywhere.
