# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Despite the name "Tamagotchi", this is a Brazilian patient/doctor health-tracking PWA (UI strings, Firestore field values and Claude prompts are in Portuguese). It is a React 19 + Vite + MUI app hosted on Firebase (Auth, Firestore, Storage, Hosting), plus one Cloud Function that uses the Claude API to extract structured data from uploaded medical documents.

**Styling:** "soft clinical" look. `src/theme.js` holds the MUI theme (font Plus Jakarta Sans, loaded in `index.html`) and the color tokens (`colors.brand` = `#634879`, ground, ink, status colors) — use the tokens, never new hex values. Shared building blocks live in `src/components/ui.jsx` (Page, PageHeader, Section, RowButton, BottomNav, BottomSheet, Segmented, ChoiceChips, Pill, PersonAvatar, Sparkline, ActionBar…); plain helpers in `uiHelpers.js`. Confirmations go through `useToast()` (`toastContext.js`). MUI is v9: use `slotProps` (`input`, `htmlInput`, `paper`) — `InputProps` / `inputProps` / `PaperProps` no longer exist and are silently dropped. The app is a single phone-width column (max 520px).

## Codebase Overview

**Stack**: React 19, Vite, MUI, Recharts, vite-plugin-pwa; Firebase Auth/Firestore/Storage/Hosting; one Node 20 Cloud Function using `@anthropic-ai/sdk`.
**Structure**: `src/App.jsx` (state machine) → `src/components/` (auth/shared), `src/pages/` (patient), `src/doctor/` (doctor), `src/services/` (all data access); `functions/` (extraction pipeline).

For detailed architecture, file-by-file exports, the full data model and known gotchas, see [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Commands

```bash
npm run dev        # Vite dev server
npm run build      # production build -> dist/ (also generates the PWA service worker)
npm run lint       # ESLint over the repo
npm run preview    # serve the built dist/

# Cloud Function (functions/, CommonJS, Node 20). Install deps separately: cd functions && npm install
firebase deploy --only hosting      # deploys dist/ (build first)
firebase deploy --only functions    # needs ANTHROPIC_API_KEY secret; optional EXTRACTION_MODEL in functions/.env

# Run processUploadedFile locally (from functions/). Put ANTHROPIC_API_KEY=... in functions/.secret.local (gitignored).
npm run emulators                                   # Auth + Functions + Firestore + Storage emulators, project demo-tamagotchi, UI on :4000
npm run seed                                        # resets the emulators; users local-patient/local-doctor (paciente@local.test / medico@local.test, password local123) + demo data
npm run simulate -- examResult path/to/laudo.pdf    # or prescription | examRequest; creates the pending doc, uploads, prints the result

# App against the emulators (repo root): VITE_USE_EMULATORS=true switches src/firebase.js to project demo-tamagotchi + local emulators
npm run dev:emulators
```

`firebase.local.json` is for the emulators only. Never reference it from `firebase.json`. Both configs use the real `firestore.rules` and `storage.rules`; the seed/simulate scripts use the Admin SDK, which bypasses them.

There is no test suite. The Firebase config is hard-coded in `src/firebase.js`, so no `.env` is needed for the client.

**Security rules** (`firestore.rules`, `storage.rules`, deployed with `firebase deploy --only firestore:rules,storage`): a patient owns docs whose `patientId` is their uid; a doctor reads a patient's data only through a confirmed `careLinks/{patientId}_{doctorId}`. Clients can never write `risks`, `biomarkerTypes`, exam-sourced `biomarkers`, or processing fields past `pending` (except `mark*UploadFailed`). Rules can authorize a doctor per patient but not over an `in` list, so cross-patient reads are one equality query per patient. A new query or write path needs a matching rule.

## Architecture

**No router.** `react-router-dom` is installed but not used. `src/App.jsx` is a state machine: `splash (only while auth resolves) → login → [forgotPassword | createAccount (step 1: role, name, e-mail, password) → completeProfile (step 2)] → app`. Auth state comes from `subscribeToAuthChanges`; a user without a `users/{uid}` profile doc goes to `completeProfile`, which asks for the role itself when there is no step-1 draft (first Google/Apple sign-in). In the app, `role` picks `PatientApp` (tabs Saúde · Evolução · Plano · Equipe, plus the "Enviar exame" FAB → `UploadExamSheet`) or `DoctorApp` (tabs Início · Pacientes · Exames; `PatientDetailPage` is the per-patient hub that opens `SendPrescriptionPage` / `RequestExamPage`). Tabs use `BottomNav` with a `section` string; sub-screens (e.g. `RiskPage`, the patient hub) early-return on local state. `DoctorApp` holds the single live subscription to the doctor's exam results and passes it to the dashboard, the Exames tab and its badge.

**Layout:** `src/components/` holds the auth/onboarding screens and shared UI, `src/pages/` the patient screens and `src/doctor/` the doctor screens. `src/services/` holds all Firestore/Storage access. Components never call Firestore directly; add new data access to a service.

**Firestore data model.** Every collection is at the root; relationships are id fields (`patientId`, `doctorId`), never nesting:
- `users/{uid}`: the profile, with `role: 'patient' | 'doctor'`
- `careLinks/{patientId}_{doctorId}`: patient↔doctor link, `status: 'pending' | 'confirmed'`, `initiatedBy`, plus copied display names. The side that did not initiate confirms. The deterministic id makes requests idempotent.
- `careContacts`: non-user care team members (nurse, family), by `patientId`
- `conducts` (prescriptions/plan items) and `exams` (`kind: 'request' | 'result'`), by `patientId` (+ `doctorId`). An exam result is one doc read by both sides: the doctor's review queue is `exams where doctorId == me and kind == 'result'`.
- `biomarkers`: one measurement per doc, `patientId, biomarkerType, value, unit, recordedAt, source ('exam' | 'manual'), examId`
- `biomarkerTypes/{key}`: global definitions `{label, unit, goodDirection}`, shared by all patients
- `risks`: one doc per calculation, `patientId, riskType, value (%), category ('baixo' | 'moderado' | 'alto'), model, horizonYears, inputs, calculatedAt`. Nothing calculates risks yet; only the seed writes them.

Queries use equality filters only and sort in memory, so no composite indexes are needed. Keep it that way or add a `firestore.indexes.json`. Storage paths still nest under `users/{patientUid}/...`; that is independent of Firestore.

**Document upload → AI extraction pipeline** (`storageService.js` + `functions/index.js`):
1. The client creates the Firestore doc first, with `processingStatus: 'pending'`, so a real id exists.
2. The client uploads to a path that includes that id: `users/{patientUid}/conducts/{id}/prescription-*`, `users/{patientUid}/exams/{id}/request-*` or `users/{patientUid}/exams/{id}/result-*`.
3. `processUploadedFile` (Storage `onObjectFinalized`) matches the path against `ROUTES`, loads `conducts/{id}` or `exams/{id}`, skips it unless the doc's `patientId` matches the uid in the path, sets `processing`, sends the file inline to Claude with a structured-output schema, then merges `medications` / `requestedExams` / `extractedValues` and sets `processingStatus: 'completed' | 'failed'` with a short `processingError` code. For exam results it also writes `biomarkers` (doc ids `{examId}_{i}`, previous ones for the exam deleted first, because trigger delivery can repeat) and creates missing `biomarkerTypes`.

The client must never set `processingStatus` past `pending`, except the `mark*UploadFailed` helpers; only the function advances it. The storage path prefixes and the `ROUTES` regexes must stay in sync. `src/components/DocumentProcessing.jsx` renders status chips and extracted data, and maps the `processingError` codes to messages, for both patient and doctor screens.

**Demo data:** the sample data lives in `src/services/demoData.js` (plain data, no Firebase imports). `functions/scripts/seed-emulators.js` (`npm run seed`) loads it into the emulators; `src/services/seedDemoData.js` adds it for one user from the browser console (`seedAllDemoData(uid)`).
