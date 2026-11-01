// Writes fictional lab reports (PDF) for testing the exam-result pipeline
// by hand: range flags and trend alerts. Upload them in the app as the
// patient ("Enviar exame") or with `npm run simulate -- examResult <file>`.
// See docs/TESTING_EXAM_ALERTS.md.
//
// Usage (from functions/): npm run test-reports
// Output: functions/scripts/fixtures/*.pdf (gitignored). Collection dates
// are relative to today, so run it again before a new round of tests.
//
// Uses @react-pdf/renderer and react from the app's node_modules (repo root).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement as h } from 'react'
import { Document, Page, Text, View, StyleSheet, renderToFile } from '@react-pdf/renderer'

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

// Matches the seeded patient (functions/scripts/seed-emulators.js), so the
// sex-specific hemoglobin range below picks the male one.
const PATIENT = { name: 'Paciente Local', sex: 'Masculino', birth: '14/03/1988' }

const monthsAgo = (months) => {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d
}

// [exam, result, unit, reference as printed]
const REPORTS = [
  {
    file: 'laudo-1-fora-da-referencia.pdf',
    collected: monthsAgo(0),
    rows: [
      ['Glicose em jejum', '126', 'mg/dL', '70 a 99 mg/dL'], // high
      ['Colesterol HDL', '35', 'mg/dL', 'Superior a 40 mg/dL'], // low
      ['Colesterol LDL', '95', 'mg/dL', 'Inferior a 100 mg/dL'], // normal
      ['Hemoglobina', '12,8', 'g/dL', 'Homens: 13,5 a 17,5 g/dL / Mulheres: 12,0 a 15,5 g/dL'], // low for a man, normal for a woman
      ['TSH', '2,1', 'µUI/mL', '0,4 a 4,0 µUI/mL'], // normal
    ],
  },
  // Vitamin B12 falls 620 -> 450 -> 320 (-48%) while staying inside the
  // range: only the third upload completes the trend. Folic acid is stable.
  ...[
    ['laudo-2a-b12-8-meses.pdf', 8, '620', '9,8'],
    ['laudo-2b-b12-4-meses.pdf', 4, '450', '10,1'],
    ['laudo-2c-b12-hoje.pdf', 0, '320', '9,9'],
  ].map(([file, months, b12, folate]) => ({
    file,
    collected: monthsAgo(months),
    rows: [
      ['Vitamina B12', b12, 'pg/mL', '211 a 911 pg/mL'],
      ['Ácido fólico', folate, 'ng/mL', '3,1 a 17,5 ng/mL'],
    ],
  })),
]

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica' },
  lab: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  muted: { color: '#666666', marginTop: 2 },
  box: { marginTop: 16, padding: 8, borderWidth: 1, borderColor: '#CCCCCC' },
  head: { flexDirection: 'row', marginTop: 16, paddingBottom: 4, borderBottomWidth: 1, fontFamily: 'Helvetica-Bold' },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 0.5, borderColor: '#CCCCCC' },
  exam: { width: '30%' },
  result: { width: '14%' },
  unit: { width: '14%' },
  ref: { width: '42%' },
  footer: { marginTop: 24, color: '#666666' },
})

const cells = (values) => [
  h(Text, { style: styles.exam, key: 0 }, values[0]),
  h(Text, { style: styles.result, key: 1 }, values[1]),
  h(Text, { style: styles.unit, key: 2 }, values[2]),
  h(Text, { style: styles.ref, key: 3 }, values[3]),
]

function report({ collected, rows }) {
  const date = collected.toLocaleDateString('pt-BR')
  return h(Document, null,
    h(Page, { size: 'A4', style: styles.page },
      h(Text, { style: styles.lab }, 'Laboratório Fictício de Testes'),
      h(Text, { style: styles.muted }, 'Documento de teste: não é um laudo real.'),
      h(View, { style: styles.box },
        h(Text, null, `Paciente: ${PATIENT.name}`),
        h(Text, null, `Sexo: ${PATIENT.sex}    Data de nascimento: ${PATIENT.birth}`),
        h(Text, null, `Data da coleta: ${date}`),
      ),
      h(View, { style: styles.head }, ...cells(['Exame', 'Resultado', 'Unidade', 'Valor de referência'])),
      ...rows.map((r, i) => h(View, { style: styles.row, key: i }, ...cells(r))),
      h(Text, { style: styles.footer }, `Liberado em ${date}.`),
    ),
  )
}

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const r of REPORTS) {
  await renderToFile(report(r), path.join(OUT_DIR, r.file))
  console.log(`${r.file}  (coleta ${r.collected.toLocaleDateString('pt-BR')})`)
}
console.log(`\nWritten to ${OUT_DIR}`)
