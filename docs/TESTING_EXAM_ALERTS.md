# Testing range flags and trend alerts by hand

How to see, in the app, the two doctor-facing alerts on exam results:

- **Range flag**: a value outside the reference range printed on the report.
- **Trend alert**: a biomarker moving the same way across exams, even inside the range.

There is no automated test suite. These are manual checks, using fictional lab reports and the local emulators.

## How the two features work

Both run in `processUploadedFile` (`functions/index.js`) when a patient's exam result file lands in Storage.

**Range flag.** Claude copies each value and the reference range printed next to it (`refLow`, `refHigh`, `refText`). For reports that print one range per sex or age, the prompt includes the patient's sex and age. The function then computes `flag` itself (`rangeFlag`), never the model:

| Situation | `flag` |
|---|---|
| value < `refLow` | `low` |
| value > `refHigh` | `high` |
| within the limits | `normal` |
| no range on the report | `null` |

**Trend alert.** After the exam's readings are saved, each biomarker in that exam is checked against the patient's whole history (`detectTrend`):

- Readings are reduced to one per day; the last reading of the day wins.
- At least 3 of the latest readings must each move the same way, with the same unit.
- The total change, first to last, must be at least 20%.
- Movement in the type's `goodDirection` doesn't alert (for example LDL falling). Types the extraction creates have no `goodDirection`, so both directions alert.

Matches are stored on the exam as `trendAlerts`.

**What each side sees**

| Where | Doctor | Patient |
|---|---|---|
| Notification (bell, push) | `result_attention`: "Resultado com alterações: …" | `result_read` only ("Seu exame foi lido") |
| Result card (Início, Exames tab, patient hub) | Red/yellow box with "N valores fora da referência" and one line per trend; flagged values in red with ↑/↓ and "Ref.: …"; flagged results sorted first | — |
| Patient hub › Indicadores | "Acima/Abaixo da referência" under the latest value; "Tendência ↓ 48% em 3 exames" | — |
| Plano › Resultados enviados | — | Ranges and flags only **after** the doctor taps "Marcar como revisado"; trends never |

## 1. Set up (once per round)

```bash
cd functions
npm run test-reports   # writes the fictional PDFs to functions/scripts/fixtures/
npm run emulators      # terminal 1: leave it running
npm run seed           # terminal 2: resets everything, demo patient + doctor + history
cd .. && npm run dev:emulators   # terminal 3: the app against the emulators
```

`functions/.secret.local` must hold `ANTHROPIC_API_KEY=...`. The extraction calls the real Claude API even with the emulators, at a few cents per report.

Logins (password `local123`):

- Patient: `paciente@local.test`
- Doctor: `medico@local.test`

Use two browser windows, one of them private, so both stay logged in.

The reports (collection dates are relative to the day you generate them):

| File | Content | Expected |
|---|---|---|
| `laudo-1-fora-da-referencia.pdf` | Glicose 126 (70–99), HDL 35 (>40), LDL 95 (<100), Hemoglobina 12,8 (men 13,5–17,5 / women 12,0–15,5), TSH 2,1 | Glicose **high**; HDL **low**; Hemoglobina **low** (the male range was picked); LDL and TSH normal; no trend |
| `laudo-2a-b12-8-meses.pdf` | B12 620, ácido fólico 9,8 (8 months ago) | nothing |
| `laudo-2b-b12-4-meses.pdf` | B12 450, ácido fólico 10,1 (4 months ago) | nothing: only 2 readings |
| `laudo-2c-b12-hoje.pdf` | B12 320, ácido fólico 9,9 (today) | B12 trend **↓ 48% in 3 exams**, all values inside the range; no alert for the stable folic acid |

## 2. Test the range flag

1. **Patient window:** tap **Enviar exame**, pick `laudo-1-fora-da-referencia.pdf`, keep Dr. Local, and send.
2. **Patient window:** in **Plano › Resultados enviados**, the chip goes "Lendo documento" → "Dados extraídos" in about 10–30 s. Open it: the values show **without** ranges or highlights (the doctor hasn't reviewed it yet).
3. **Doctor window:** the bell has "Novo resultado para revisar" and, once extraction ends, "Resultado com alterações: Paciente Local · Glicose em jejum acima da referência · Colesterol HDL abaixo da referência · +1".
4. **Doctor window:** in **Exames**, the card shows the red box "3 valores fora da referência". Glicose ↑ 126, HDL ↓ 35 and Hemoglobina ↓ 12,8 are red with "Ref.: …", listed before the normal values.
5. **Doctor window:** open the patient (tap the card header). The result appears under "Para revisar"; **Indicadores** shows "Abaixo da referência" under Hemoglobina.
6. **Doctor window:** tap **Marcar como revisado**.
7. **Patient window:** the bell has "Dr. Local revisou seu exame: 3 valores fora da referência". In **Plano**, the same result now shows ranges, ↑/↓ and the "Converse com seu médico" hint.

## 3. Test the trend alert

Send the three B12 reports **in order** (2a, 2b, 2c) as the patient, waiting for "Dados extraídos" between them. Collection dates come from the report, so order only matters for when the alert appears.

- After **2a** and **2b**: no attention notification, and no box on the cards.
- After **2c**: the doctor gets "Resultado com alterações: Paciente Local · Vitamina B12 em queda (-48%)". The card shows a **yellow** box (trend only, nothing out of range): "Vitamina B12: tendência de queda (↓ 48% em 3 exames) · 620 → 450 → 320 pg/mL · desde mar. de 2026".
- In the patient hub (reopen it, because indicators load when the hub opens): Vitamina B12 reads "Tendência ↓ 48% em 3 exames" in yellow.
- Patient side: nothing about the trend, even after review.

**Shortcut with one Claude call:** add the two older readings by hand (see section 4) and send only `laudo-2c-b12-hoje.pdf`. The trend check reads the whole history, manual readings included.

**The seeded ferritin alert** (180 → 100 → 80) is written straight into the database by `npm run seed`. It shows on the cards but never sends a notification, because the trigger only fires when an exam goes *to* `completed`. Use the uploads above to test the notification.

## 4. Without the AI: edit the database by hand

Useful to test the screens and notifications without calling Claude, or to set up history. Open the emulator UI at http://127.0.0.1:4000 › Firestore. On production, the Firebase console does the same: both bypass the security rules.

**Add history for a trend.** In `biomarkers`, use **Add document** (auto id) with:

| field | type | value |
|---|---|---|
| `patientId` | string | `local-patient` |
| `biomarkerType` | string | `vitaminaB12` (must match the key the extraction uses; check `biomarkerTypes`) |
| `value` | number | `620` |
| `unit` | string | `pg/mL` |
| `recordedAt` | timestamp | 8 months ago |
| `source` | string | `manual` |

Add a second document with value `450`, 4 months ago. Then upload `laudo-2c-b12-hoje.pdf`.

**Fake a finished extraction (flag notification, no AI).** The notification fires on the change to `completed`, so do it in two steps:

1. In `exams`, add a document:

   | field | type | value |
   |---|---|---|
   | `patientId` | string | `local-patient` |
   | `patientName` | string | `Paciente Local` |
   | `doctorId` | string | `local-doctor` |
   | `doctorName` | string | `Dr. Local` |
   | `kind` | string | `result` |
   | `title` | string | `Teste manual` |
   | `category` | string | `laboratorial` |
   | `reviewStatus` | string | `not_reviewed` |
   | `submittedAt` | timestamp | now |
   | `processingStatus` | string | `processing` |

2. Edit the same document. Add `extractedValues` (array) with one map: `biomarkerType` `glicose`, `label` `Glicose`, `value` `180`, `unit` `mg/dL`, `refLow` `70`, `refHigh` `99`, `refText` `70 a 99 mg/dL`, `flag` `high`. Save, then change `processingStatus` to `completed`.

The doctor gets `result_attention`, and the card shows the red box. You can also add a `trendAlerts` array by hand to see how a trend renders. Its fields are listed in `examsService.js`.

What this does **not** test: `rangeFlag` and `detectTrend`. You typed the results yourself, so only an upload exercises that logic.

## 5. On the real platform (production)

The same PDFs work in the deployed app with a test patient and a test doctor who have a confirmed link. Things to know:

- Each upload is a billed Claude call.
- The extracted `biomarkers` stay in the patient's history and feed later trend checks. Use a throwaway patient account, or delete its `biomarkers`, `exams` and `notifications` in the Firebase console afterwards.
- The reports print "Paciente Local, Masculino". The sex used for the range comes from the **profile** of the patient who uploads, not from the PDF. With a female test patient, the hemoglobin value 12,8 is normal.

## Gotchas

- **Same-day readings:** "one reading per day, the last wins" also applies to the patient hub's latest value. The seed writes today's readings at seed time; a report collected today is stored at 09:00 (BRT). If you seeded after 09:00, the hub shows the seeded Glicose/HDL instead of the flagged values. The result card is unaffected. Hemoglobina has no seeded history, so it always shows.
- **No collection date on the report:** the reading is dated at processing time. Several undated reports on the same day count as one day, so no trend.
- **Keys:** the trend only connects readings with the same `biomarkerType`. The model is given the existing keys and usually reuses them (Glicose em jejum → `glicose`). If a run creates a near-duplicate (for example `glicoseJejum`), its history is separate.
- **Start over:** `npm run seed` wipes the emulators. Run `npm run test-reports` again on another day so "hoje" is today.
- **From the terminal** (no app): `npm run simulate -- examResult scripts/fixtures/laudo-2c-b12-hoje.pdf` prints `extractedValues` (with `flag`) and `trendAlerts`.
