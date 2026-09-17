// One-off helper to populate sample data for a patient during development.
// Run it once from the browser console (after logging in) like:
//
//   import('./src/services/seedDemoData.js').then(m => m.seedAllDemoData('THE_UID'))
//
// or call individual seedDemoMetrics/seedDemoCareTeam/seedDemoExams/seedDemoConducts
// if you only want to (re)seed one entity. Safe to run more than once — it
// just adds more documents each time.

import { ensureMetricDefinition, addMetricReading } from './metricsService'
import { addCareTeamMember } from './careTeamService'
import { addExam } from './examsService'
import { addConduct } from './conductsService'

const METRIC_DEFINITIONS = [
  { key: 'ldl', label: 'LDL', unit: 'mg/dL' },
  { key: 'apob', label: 'ApoB', unit: 'mg/dL' },
  { key: 'hba1c', label: 'HbA1c', unit: '%' },
  { key: 'gorduraVisceral', label: 'Gordura visceral', unit: '%' },
  { key: 'sono', label: 'Sono', unit: 'min/noite' },
]

// [metricKey, value, monthsAgo]
const SAMPLE_READINGS = [
  ['ldl', 142, 12], ['ldl', 135, 10], ['ldl', 128, 8], ['ldl', 118, 6], ['ldl', 110, 4], ['ldl', 102, 2], ['ldl', 98, 0],
  ['apob', 114, 12], ['apob', 110, 10], ['apob', 106, 8], ['apob', 103, 6], ['apob', 100, 4], ['apob', 99, 2], ['apob', 98, 0],
  ['hba1c', 5.7, 12], ['hba1c', 5.7, 8], ['hba1c', 5.65, 6], ['hba1c', 5.6, 4], ['hba1c', 5.6, 2], ['hba1c', 5.6, 0],
  ['gorduraVisceral', 22, 2], ['gorduraVisceral', 20.2, 0],
  ['sono', 397, 2], ['sono', 360, 0], // minutes; 397 -> 360 is the "-37 min/noite" shown on Saúde
]

function monthsAgoDate(months) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d
}

export async function seedDemoMetrics(uid) {
  for (const def of METRIC_DEFINITIONS) {
    await ensureMetricDefinition(def.key, { label: def.label, unit: def.unit })
  }
  for (const [metricKey, value, monthsAgo] of SAMPLE_READINGS) {
    await addMetricReading(uid, metricKey, value, monthsAgoDate(monthsAgo))
  }
  console.log('Demo metrics seeded for', uid)
}

const SAMPLE_CARE_TEAM = [
  { name: 'Dr. Ricardo Almeida', memberType: 'doctor', specialty: 'Cardiologista', crm: 'CRM 12345' },
  { name: 'Dra. Mariana Costa', memberType: 'doctor', specialty: 'Oncologista', crm: 'CRM 67890' },
  { name: 'Dr. Felipe Martins', memberType: 'doctor', specialty: 'Clínico geral', crm: 'CRM 54321' },
  { name: 'Enf. Juliana Souza', memberType: 'nurse', specialty: 'Enfermagem domiciliar' },
  { name: 'Ana Ferreira', memberType: 'family', relationship: 'Filha' },
]

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

const SAMPLE_EXAMS = [
  { title: 'ApoB + Perfil lipídico', status: 'solicitado', priority: 'prioritario', icon: 'lab', scheduledDate: daysFromNow(23) },
  { title: 'Colonoscopia', status: 'solicitado', priority: 'prioritario', icon: 'imaging', scheduledDate: daysFromNow(30) },
  { title: 'Vitamina D', status: 'solicitado', priority: 'rotina', icon: 'vaccine', scheduledDate: daysFromNow(60) },
  { title: 'Ressonância de crânio', status: 'solicitado', priority: 'rotina', icon: 'imaging', scheduledDate: daysFromNow(90) },
  { title: 'Hemograma completo', status: 'solicitado', priority: 'rotina', icon: 'blood', scheduledDate: daysFromNow(180) },
]

const SAMPLE_CONDUCTS = [
  {
    title: 'Repetir ApoB + perfil lipídico',
    why: 'Seu ApoB melhorou após o tratamento, mas ainda permanece acima da sua meta personalizada.',
    timeframe: 'agora',
    type: 'followup',
    dueDate: daysFromNow(23),
  },
  {
    title: 'Acompanhamento oncológico',
    why: 'Achado que exige investigação complementar.',
    timeframe: 'agora',
    type: 'followup',
    dueDate: daysFromNow(30),
  },
  {
    title: 'Evitar carnes gordurosas',
    why: 'Reduzir LDL e ApoB através da dieta, junto ao tratamento medicamentoso.',
    timeframe: 'proximos90',
    type: 'diet',
    dueDate: daysFromNow(90),
  },
  {
    title: 'Evitar exercícios de alta intensidade',
    why: 'Até a reavaliação cardiológica, priorizar atividades de baixo impacto.',
    timeframe: 'proximos90',
    type: 'exercise',
    dueDate: daysFromNow(60),
  },
  {
    title: 'Tomar estatina diariamente',
    why: 'Controle contínuo do colesterol conforme prescrição.',
    timeframe: 'agora',
    type: 'medication',
    dueDate: daysFromNow(1),
  },
]

export async function seedDemoCareTeam(uid) {
  for (const member of SAMPLE_CARE_TEAM) {
    await addCareTeamMember(uid, member)
  }
  console.log('Demo care team seeded for', uid)
}

export async function seedDemoExams(uid) {
  for (const exam of SAMPLE_EXAMS) {
    await addExam(uid, exam)
  }
  console.log('Demo exams seeded for', uid)
}

export async function seedDemoConducts(uid) {
  for (const conduct of SAMPLE_CONDUCTS) {
    await addConduct(uid, conduct)
  }
  console.log('Demo conducts seeded for', uid)
}

export async function seedAllDemoData(uid) {
  await seedDemoMetrics(uid)
  await seedDemoCareTeam(uid)
  await seedDemoExams(uid)
  await seedDemoConducts(uid)
  console.log('All demo data seeded for', uid)
}
