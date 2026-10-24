// Resets the local emulators and fills them with a complete demo dataset,
// so the app (npm run dev:emulators at the repo root) and the extraction
// workflow (npm run simulate) can be tested together:
//   - Auth users local-patient / local-doctor (the uids simulate-upload.js uses)
//   - their users/{uid} profiles and a confirmed careLink between them
//   - careContacts, biomarkerTypes, biomarkers, risks, exams, conducts and
//     appointments for the patient, from src/services/demoData.js (same data as the
//     browser seeder)
//
// Usage (emulators must be running, see `npm run emulators`):
//   node scripts/seed-emulators.js
//
// Safe to run again: it wipes the Firestore and Auth emulators first.

// Set before firebase-admin loads, so this script can only ever talk to
// the local emulators, never to a real project.
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099'

const path = require('path')
const { pathToFileURL } = require('url')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, Timestamp } = require('firebase-admin/firestore')
const { getAuth } = require('firebase-admin/auth')

const PROJECT_ID = 'demo-tamagotchi'
const PASSWORD = 'local123'

const PATIENT = {
  uid: 'local-patient',
  profile: {
    role: 'patient',
    fullName: 'Paciente Local',
    email: 'paciente@local.test',
    phone: '(11) 90000-0001',
    dateOfBirth: '1988-03-14',
    cpf: '000.000.000-01',
    country: 'Brasil',
    cityState: 'São Paulo/SP',
    sexAssignedAtBirth: 'Masculino',
    genderIdentity: 'Homem cisgênero',
  },
}

const DOCTOR = {
  uid: 'local-doctor',
  profile: {
    role: 'doctor',
    fullName: 'Dr. Local',
    email: 'medico@local.test',
    phone: '(11) 90000-0002',
    dateOfBirth: '1975-08-02',
    cpf: '000.000.000-02',
    country: 'Brasil',
    cityState: 'São Paulo/SP',
    crm: '123456',
    crmState: 'SP',
    specialty: 'Cardiologia',
    rqe: '7890',
  },
}

initializeApp({ projectId: PROJECT_ID })
const db = getFirestore()

const toTimestamp = (date) => (date ? Timestamp.fromDate(date) : null)

async function wipeEmulators() {
  const firestore = `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`
  const auth = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`
  for (const url of [firestore, auth]) {
    const res = await fetch(url, { method: 'DELETE' })
    if (!res.ok) throw new Error(`Could not reset ${url} (${res.status})`)
  }
}

async function createUser({ uid, profile }) {
  await getAuth().createUser({ uid, email: profile.email, password: PASSWORD, displayName: profile.fullName })
  await db.doc(`users/${uid}`).set(profile)
}

async function main() {
  // demoData.js is an ES module (the repo root is "type": "module").
  const demoData = await import(pathToFileURL(path.join(__dirname, '../../src/services/demoData.js')).href)

  await wipeEmulators()
  console.log('Emulators reset')

  await createUser(PATIENT)
  await createUser(DOCTOR)

  const patientId = PATIENT.uid
  const doctorId = DOCTOR.uid
  const now = Timestamp.now()
  const batch = db.batch()

  // Mirrors careTeamService.requestPatientDoctorLink + confirmPatientDoctorLink.
  batch.set(db.doc(`careLinks/${patientId}_${doctorId}`), {
    patientId,
    doctorId,
    patientName: PATIENT.profile.fullName,
    doctorName: DOCTOR.profile.fullName,
    doctorSpecialty: DOCTOR.profile.specialty,
    doctorCrm: `CRM ${DOCTOR.profile.crm}/${DOCTOR.profile.crmState}`,
    status: 'confirmed',
    initiatedBy: 'patient',
    createdAt: now,
    confirmedAt: now,
  })

  demoData.SAMPLE_CARE_CONTACTS.forEach((contact) => {
    batch.set(db.collection('careContacts').doc(), { ...contact, patientId })
  })

  const units = {}
  demoData.BIOMARKER_TYPES.forEach(({ key, label, unit, goodDirection }) => {
    units[key] = unit
    batch.set(db.doc(`biomarkerTypes/${key}`), { label, unit, goodDirection })
  })

  demoData.SAMPLE_BIOMARKERS.forEach(([biomarkerType, value, monthsAgo]) => {
    batch.set(db.collection('biomarkers').doc(), {
      patientId,
      biomarkerType,
      value,
      unit: units[biomarkerType],
      recordedAt: toTimestamp(demoData.monthsAgoDate(monthsAgo)),
      source: 'manual',
    })
  })

  demoData.SAMPLE_RISKS.forEach(([riskType, value, category, model, horizonYears, monthsAgo, inputs]) => {
    batch.set(db.collection('risks').doc(), {
      patientId,
      riskType,
      value,
      category,
      model,
      horizonYears,
      inputs,
      calculatedAt: toTimestamp(demoData.monthsAgoDate(monthsAgo)),
    })
  })

  // Requested by the linked doctor, as if sent from SendPrescriptionPage
  // (without an attached file, so there is nothing to extract).
  const doctorFields = { doctorId, doctorName: DOCTOR.profile.fullName }

  demoData.sampleExams().forEach((exam) => {
    batch.set(db.collection('exams').doc(), {
      kind: 'request',
      ...exam,
      ...doctorFields,
      patientId,
      scheduledDate: toTimestamp(exam.scheduledDate),
    })
  })

  const result = demoData.sampleExamResult()
  batch.set(db.collection('exams').doc(), {
    ...result,
    ...doctorFields,
    patientId,
    patientName: PATIENT.profile.fullName,
    kind: 'result',
    status: 'realizado',
    priority: 'rotina',
    icon: 'lab',
    scheduledDate: toTimestamp(result.submittedAt),
    submittedAt: toTimestamp(result.submittedAt),
    reviewStatus: 'not_reviewed',
    processingStatus: 'completed',
    trendAlerts: result.trendAlerts.map((t) => ({ ...t, values: t.values.map((v) => ({ ...v, recordedAt: toTimestamp(v.recordedAt) })) })),
  })

  demoData.sampleConducts().forEach((conduct) => {
    batch.set(db.collection('conducts').doc(), {
      ...conduct,
      ...doctorFields,
      patientId,
      status: 'pending',
      dueDate: toTimestamp(conduct.dueDate),
    })
  })

  // Appointments: later today (confirmed), tomorrow (awaiting the
  // patient), next week (patient asked to reschedule).
  const at = (days, hour, minute = 0) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    d.setHours(hour, minute, 0, 0)
    return toTimestamp(d)
  }
  const laterToday = new Date().getHours() < 22 ? at(0, new Date().getHours() + 1) : at(0, 23, 30)
  const appointmentBase = {
    patientId,
    patientName: PATIENT.profile.fullName,
    doctorId,
    doctorName: DOCTOR.profile.fullName,
    doctorSpecialty: DOCTOR.profile.specialty,
    durationMin: 30,
    rescheduleNote: '',
    createdAt: now,
    updatedAt: now,
  }
  ;[
    { startsAt: laterToday, mode: 'presencial', location: 'Av. Paulista, 1000, sala 42', notes: '', status: 'confirmed' },
    { startsAt: at(1, 9), mode: 'telemedicina', location: 'https://meet.example.com/consulta-local', notes: 'Traga seus exames mais recentes.', status: 'scheduled' },
    { startsAt: at(7, 14, 30), mode: 'presencial', location: 'Av. Paulista, 1000, sala 42', notes: '', status: 'reschedule_requested', rescheduleNote: 'Prefiro de manhã' },
  ].forEach((a) => batch.set(db.collection('appointments').doc(), { ...appointmentBase, ...a }))

  await batch.commit()

  console.log('Seeded: 2 users, 1 careLink, careContacts, biomarkerTypes, biomarkers, risks, exams, conducts, appointments')
  console.log(`\nLog in (npm run dev:emulators at the repo root) with password ${PASSWORD}:`)
  console.log(`  patient: ${PATIENT.profile.email}`)
  console.log(`  doctor:  ${DOCTOR.profile.email}`)
  console.log('Browse the data at http://127.0.0.1:4000')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message)
    if (err.cause?.code === 'ECONNREFUSED') console.error('Are the emulators running? See `npm run emulators`.')
    process.exit(1)
  })
