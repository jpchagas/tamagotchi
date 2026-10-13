// Sample data shared by the browser seeder (seedDemoData.js) and the
// emulator seeder (functions/scripts/seed-emulators.js). Plain data only —
// no Firebase imports — so Node can import it too.

export function monthsAgoDate(months) {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d
}

export function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export const BIOMARKER_TYPES = [
  { key: 'ldl', label: 'LDL', unit: 'mg/dL', goodDirection: 'down' },
  { key: 'hdl', label: 'HDL', unit: 'mg/dL', goodDirection: 'up' },
  { key: 'colesterolTotal', label: 'Colesterol total', unit: 'mg/dL', goodDirection: 'down' },
  { key: 'apob', label: 'ApoB', unit: 'mg/dL', goodDirection: 'down' },
  { key: 'hba1c', label: 'HbA1c', unit: '%', goodDirection: 'down' },
  { key: 'glicose', label: 'Glicose', unit: 'mg/dL', goodDirection: 'down' },
  { key: 'sbp', label: 'Pressão sistólica', unit: 'mmHg', goodDirection: 'down' },
  { key: 'egfr', label: 'eGFR', unit: 'mL/min/1,73m²', goodDirection: 'up' },
  { key: 'gorduraVisceral', label: 'Gordura visceral', unit: '%', goodDirection: 'down' },
  { key: 'sono', label: 'Sono', unit: 'min/noite', goodDirection: 'up' },
]

// [biomarkerType, value, monthsAgo]
export const SAMPLE_BIOMARKERS = [
  ['ldl', 142, 12], ['ldl', 135, 10], ['ldl', 128, 8], ['ldl', 118, 6], ['ldl', 110, 4], ['ldl', 102, 2], ['ldl', 98, 0],
  ['hdl', 41, 12], ['hdl', 43, 6], ['hdl', 45, 0],
  ['colesterolTotal', 221, 12], ['colesterolTotal', 205, 6], ['colesterolTotal', 182, 0],
  ['apob', 114, 12], ['apob', 110, 10], ['apob', 106, 8], ['apob', 103, 6], ['apob', 100, 4], ['apob', 99, 2], ['apob', 98, 0],
  ['hba1c', 5.7, 12], ['hba1c', 5.7, 8], ['hba1c', 5.65, 6], ['hba1c', 5.6, 4], ['hba1c', 5.6, 2], ['hba1c', 5.6, 0],
  ['glicose', 104, 12], ['glicose', 99, 6], ['glicose', 96, 0],
  ['sbp', 134, 12], ['sbp', 131, 6], ['sbp', 128, 0],
  ['egfr', 96, 12], ['egfr', 94, 0],
  ['gorduraVisceral', 22, 2], ['gorduraVisceral', 20.2, 0],
  ['sono', 397, 2], ['sono', 360, 0],
]

// DEMO VALUES ONLY — not the output of any real calculation.
// [riskType, value, category, model, horizonYears, monthsAgo, inputs]
export const SAMPLE_RISKS = [
  ['cardiovascular', 9.8, 'moderado', 'PREVENT', 10, 12, { sbp: 134, colesterolTotal: 221, hdl: 41, egfr: 96 }],
  ['cardiovascular', 7.4, 'moderado', 'PREVENT', 10, 0, { sbp: 128, colesterolTotal: 182, hdl: 45, egfr: 94 }],
  ['diabetes', 6.1, 'baixo', 'FINDRISC', 10, 0, { hba1c: 5.6, glicose: 96 }],
  ['metabolico', null, 'baixo', 'Critérios IDF', null, 0, { glicose: 96, hdl: 45, sbp: 128 }],
  ['oncologico', null, 'alto', 'NCCN (colorretal)', null, 0, null],
  ['cerebral', null, 'baixo', 'Avaliação clínica', null, 0, null],
]

// Doctors are real users linked through careLinks, so only non-user
// contacts are listed here.
export const SAMPLE_CARE_CONTACTS = [
  { name: 'Enf. Juliana Souza', memberType: 'nurse', specialty: 'Enfermagem domiciliar' },
  { name: 'Ana Ferreira', memberType: 'family', relationship: 'Filha' },
]

// Functions, so the dates are relative to when the seed runs.
export function sampleExams() {
  return [
    { title: 'ApoB + Perfil lipídico', status: 'solicitado', priority: 'prioritario', icon: 'lab', scheduledDate: daysFromNow(23) },
    { title: 'Colonoscopia', status: 'solicitado', priority: 'prioritario', icon: 'imaging', scheduledDate: daysFromNow(30) },
    { title: 'Vitamina D', status: 'solicitado', priority: 'rotina', icon: 'vaccine', scheduledDate: daysFromNow(60) },
    { title: 'Ressonância de crânio', status: 'solicitado', priority: 'rotina', icon: 'imaging', scheduledDate: daysFromNow(90) },
    { title: 'Hemograma completo', status: 'solicitado', priority: 'rotina', icon: 'blood', scheduledDate: daysFromNow(180) },
  ]
}

export function sampleConducts() {
  return [
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
}
