// One-off helper to populate sample data for a patient during development.
// Run it once from the browser console (after logging in) like:
//
//   import('./src/services/seedDemoData.js').then(m => m.seedAllDemoData('THE_UID'))
//
// or call individual seedDemoBiomarkers/seedDemoRisks/seedDemoCareContacts/
// seedDemoExams/seedDemoConducts if you only want to (re)seed one entity.
// Not idempotent — it adds more documents each time, so wipe the
// collections first if you need a clean slate. For the local emulators,
// use `npm run seed` in functions/ instead (it resets them first).

import { saveBiomarkerType, addBiomarker } from './biomarkersService'
import { addRisk } from './risksService'
import { addCareContact } from './careTeamService'
import { addExam } from './examsService'
import { addConduct } from './conductsService'
import {
  BIOMARKER_TYPES,
  SAMPLE_BIOMARKERS,
  SAMPLE_RISKS,
  SAMPLE_CARE_CONTACTS,
  sampleExams,
  sampleConducts,
  monthsAgoDate,
} from './demoData'

export async function seedDemoBiomarkers(uid) {
  for (const type of BIOMARKER_TYPES) {
    await saveBiomarkerType(type.key, type)
  }
  const units = Object.fromEntries(BIOMARKER_TYPES.map((t) => [t.key, t.unit]))
  for (const [biomarkerType, value, monthsAgo] of SAMPLE_BIOMARKERS) {
    await addBiomarker(uid, { biomarkerType, value, unit: units[biomarkerType], recordedAt: monthsAgoDate(monthsAgo) })
  }
  console.log('Demo biomarkers seeded for', uid)
}

export async function seedDemoRisks(uid) {
  for (const [riskType, value, category, model, horizonYears, monthsAgo, inputs] of SAMPLE_RISKS) {
    await addRisk(uid, { riskType, value, category, model, horizonYears, inputs, calculatedAt: monthsAgoDate(monthsAgo) })
  }
  console.log('Demo risks seeded for', uid)
}

export async function seedDemoCareContacts(uid) {
  for (const contact of SAMPLE_CARE_CONTACTS) {
    await addCareContact(uid, contact)
  }
  console.log('Demo care contacts seeded for', uid)
}

export async function seedDemoExams(uid) {
  for (const exam of sampleExams()) {
    await addExam(uid, exam)
  }
  console.log('Demo exams seeded for', uid)
}

export async function seedDemoConducts(uid) {
  for (const conduct of sampleConducts()) {
    await addConduct(uid, conduct)
  }
  console.log('Demo conducts seeded for', uid)
}

export async function seedAllDemoData(uid) {
  await seedDemoBiomarkers(uid)
  await seedDemoRisks(uid)
  await seedDemoCareContacts(uid)
  await seedDemoExams(uid)
  await seedDemoConducts(uid)
  console.log('All demo data seeded for', uid)
}
