import { Document, Page, View, Text, Svg, Polyline, StyleSheet, Font } from '@react-pdf/renderer'
import { colors } from '../theme'
import { TONES, changeTone } from './uiHelpers'
import { riskTypeLabel, formatRiskValue, riskTone } from '../services/risksService'

// The PDF health report, rendered with @react-pdf/renderer's pdf(). Loaded
// with import() from HealthReport.jsx only when someone exports, so the PDF
// library stays out of the main bundle.
// Uses the PDF's built-in Helvetica: it covers Portuguese accents, but not
// symbols like arrows (WinAnsi only), so the text avoids them.

// Never hyphenate words (the default patterns are English).
Font.registerHyphenationCallback((word) => [word])

const CONDUCT_TAGS = {
  medication: 'Remédio',
  diet: 'Dieta',
  exercise: 'Exercício',
  followup: 'Consulta',
}

const RESULT_STATUS = {
  reviewed: { label: 'Revisado', tone: 'good' },
  not_reviewed: { label: 'Aguardando revisão', tone: 'warn' },
}

const formatDate = (date) => (date ? date.toLocaleDateString('pt-BR') : '')
const formatNumber = (v) => (typeof v === 'number' ? v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : String(v ?? ''))
const withUnit = (value, unit) => `${formatNumber(value)}${unit ? ` ${unit}` : ''}`

// "Caiu 12% · melhorou" — computeChange's result, in words.
function changeText(change) {
  if (!change) return 'Uma medição'
  if (change.direction === 'flat') return 'Estável'
  const pct = Math.abs(Math.round(change.percent))
  const verdict = change.improving === null ? '' : change.improving ? ' · melhorou' : ' · piorou'
  return `${change.direction === 'down' ? 'Caiu' : 'Subiu'} ${pct || '<1'}%${verdict}`
}

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 64, paddingHorizontal: 40, fontFamily: 'Helvetica', fontSize: 9.5, color: colors.ink },
  // Not on the Page: a Page lineHeight hides the fixed footer's page numbers.
  content: { fontSize: 9.5, lineHeight: 1.35 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 12, marginBottom: 18, borderBottomWidth: 2, borderBottomColor: colors.brand },
  overline: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: colors.brand, letterSpacing: 1, textTransform: 'uppercase' },
  // Line heights are set wherever the font size differs from the page's:
  // the inherited one is absolute, so larger text would overlap.
  name: { fontFamily: 'Helvetica-Bold', fontSize: 18, lineHeight: 1.25, marginTop: 3 },
  muted: { color: colors.muted },
  bold: { fontFamily: 'Helvetica-Bold' },
  meta: { fontSize: 8.5, color: colors.muted, textAlign: 'right' },
  section: { marginBottom: 18 },
  sectionTitle: { fontFamily: 'Helvetica-Bold', fontSize: 12, lineHeight: 1.3, color: colors.brand, marginBottom: 6 },
  note: { fontSize: 8, color: colors.muted, marginTop: 4 },
  empty: { color: colors.muted },
  table: { borderWidth: 1, borderColor: colors.line, borderRadius: 4 },
  headRow: { flexDirection: 'row', backgroundColor: colors.ground, paddingVertical: 4, paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: colors.line },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: colors.muted, textTransform: 'uppercase' },
  small: { fontSize: 8, color: colors.muted },
  pill: { alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 1.5, paddingHorizontal: 5 },
  pillText: { fontFamily: 'Helvetica-Bold', fontSize: 8 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 4, padding: 8, marginBottom: 6 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  subList: { marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.line },
  values: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: colors.line },
  value: { width: '50%', flexDirection: 'row', justifyContent: 'space-between', paddingRight: 12, paddingVertical: 1 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.line, fontSize: 7.5, color: colors.subtle },
})

function Pill({ tone, children }) {
  const t = TONES[tone] || TONES.neutral
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.pillText, { color: t.color }]}>{children}</Text>
    </View>
  )
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      {/* Keeps the title from being stranded at the bottom of a page. */}
      <Text style={styles.sectionTitle} minPresenceAhead={90}>{title}</Text>
      {children}
    </View>
  )
}

function Trend({ values, color }) {
  if (values.length < 2) return null
  const width = 56
  const height = 14
  const pad = 1.5
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const points = values
    .map((v, i) => `${(pad + (i / (values.length - 1)) * (width - 2 * pad)).toFixed(1)},${(pad + (1 - (v - min) / span) * (height - 2 * pad)).toFixed(1)}`)
    .join(' ')
  return (
    <Svg width={width} height={height}>
      <Polyline points={points} stroke={color} strokeWidth={1.2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  )
}

function Risks({ risks }) {
  if (risks.length === 0) return <Text style={styles.empty}>Nenhum risco calculado.</Text>
  const cols = [2, 1.6, 1.8, 1.1]
  return (
    <View style={styles.table}>
      <View style={styles.headRow}>
        {['Área', 'Resultado', 'Modelo', 'Calculado em'].map((label, i) => <Text key={label} style={[styles.th, { flex: cols[i] }]}>{label}</Text>)}
      </View>
      {risks.map((r) => (
        <View key={r.id} style={styles.row} wrap={false}>
          <Text style={[styles.bold, { flex: cols[0] }]}>{riskTypeLabel(r.riskType)}</Text>
          <View style={{ flex: cols[1] }}><Pill tone={riskTone(r)}>{formatRiskValue(r)}</Pill></View>
          <Text style={[styles.muted, { flex: cols[2] }]}>{[r.model, r.horizonYears && `${r.horizonYears} anos`].filter(Boolean).join(' · ')}</Text>
          <Text style={[styles.muted, { flex: cols[3] }]}>{formatDate(r.calculatedAt)}</Text>
        </View>
      ))}
    </View>
  )
}

function Biomarkers({ biomarkers }) {
  if (biomarkers.length === 0) return <Text style={styles.empty}>Nenhum indicador medido no período.</Text>
  const cols = [2, 1.4, 1, 1.9, 0.9]
  return (
    <>
      <View style={styles.table}>
        <View style={styles.headRow}>
          {['Indicador', 'Último valor', 'Data', 'Variação no período', 'Tendência'].map((label, i) => <Text key={label} style={[styles.th, { flex: cols[i] }]}>{label}</Text>)}
        </View>
        {biomarkers.map((b) => {
          const tone = TONES[changeTone(b.change)]
          return (
            <View key={b.key} style={styles.row} wrap={false}>
              <Text style={[styles.bold, { flex: cols[0] }]}>{b.label}</Text>
              <Text style={[styles.bold, { flex: cols[1] }]}>{withUnit(b.latest.value, b.unit)}</Text>
              <Text style={[styles.muted, { flex: cols[2] }]}>{formatDate(b.latest.recordedAt)}</Text>
              <View style={{ flex: cols[3] }}>
                <Text style={[styles.bold, { color: tone.color }]}>{changeText(b.change)}</Text>
                {b.change && <Text style={styles.small}>{`desde ${formatNumber(b.first.value)} (${formatDate(b.first.recordedAt)})`}</Text>}
              </View>
              <View style={{ flex: cols[4] }}><Trend values={b.readings.map((r) => r.value)} color={tone.color} /></View>
            </View>
          )
        })}
      </View>
      <Text style={styles.note}>Valores de laudos enviados são lidos automaticamente do documento; em caso de dúvida, confira o laudo original.</Text>
    </>
  )
}

function Conducts({ conducts }) {
  if (conducts.length === 0) return <Text style={styles.empty}>Nenhuma orientação ativa.</Text>
  return conducts.map((c) => {
    const medications = c.processingStatus === 'completed' ? c.medications || [] : []
    return (
      <View key={c.id} style={styles.card} wrap={false}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bold}>{c.title}</Text>
            <Text style={styles.small}>{[c.dueDate ? `Prazo ${formatDate(c.dueDate)}` : 'Contínuo', c.doctorName].filter(Boolean).join(' · ')}</Text>
          </View>
          <Pill tone="brand">{CONDUCT_TAGS[c.type] || 'Plano'}</Pill>
        </View>
        {c.why ? <Text style={[styles.muted, { marginTop: 3 }]}>{c.why}</Text> : null}
        {medications.length > 0 && (
          <View style={styles.subList}>
            {medications.map((m, i) => (
              <Text key={i}>
                <Text style={styles.bold}>{[m.name, m.dosage].filter(Boolean).join(' ')}</Text>
                {m.instructions ? <Text style={styles.muted}>{` — ${m.instructions}`}</Text> : null}
              </Text>
            ))}
          </View>
        )}
      </View>
    )
  })
}

function ExamRequests({ requests }) {
  if (requests.length === 0) return <Text style={styles.empty}>Nenhum exame pedido em aberto.</Text>
  return requests.map((e) => {
    const requestedExams = e.processingStatus === 'completed' ? e.requestedExams || [] : []
    return (
      <View key={e.id} style={styles.card} wrap={false}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bold}>{e.title}</Text>
            <Text style={styles.small}>{[e.scheduledDate && `Fazer até ${formatDate(e.scheduledDate)}`, e.doctorName].filter(Boolean).join(' · ')}</Text>
          </View>
          {e.priority === 'prioritario' && <Pill tone="alert">Prioritário</Pill>}
        </View>
        {requestedExams.length > 0 && (
          <View style={styles.subList}>
            {requestedExams.map((r, i) => {
              // Tolerates the older string-only shape too (see DocumentProcessing).
              const name = typeof r === 'string' ? r : r.name
              const notes = typeof r === 'string' ? '' : r.notes
              return <Text key={i}>{name}{notes ? <Text style={styles.muted}>{` — ${notes}`}</Text> : null}</Text>
            })}
          </View>
        )}
      </View>
    )
  })
}

function Results({ results }) {
  if (results.length === 0) return <Text style={styles.empty}>Nenhum resultado enviado no período.</Text>
  return results.map((r) => {
    const status = RESULT_STATUS[r.reviewStatus]
    const values = r.processingStatus === 'completed' ? r.extractedValues || [] : []
    return (
      <View key={r.id} style={styles.card} wrap={false}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bold}>{r.title}</Text>
            <Text style={styles.small}>{[`Enviado em ${formatDate(r.submittedAt)}`, r.doctorName && `para ${r.doctorName}`].filter(Boolean).join(' · ')}</Text>
          </View>
          {status && <Pill tone={status.tone}>{status.label}</Pill>}
        </View>
        {r.processingStatus === 'failed' && <Text style={[styles.small, { marginTop: 3 }]}>Não foi possível ler os valores deste documento.</Text>}
        {(r.processingStatus === 'pending' || r.processingStatus === 'processing') && <Text style={[styles.small, { marginTop: 3 }]}>Leitura do documento em andamento.</Text>}
        {values.length > 0 && (
          <View style={styles.values}>
            {values.map((v, i) => (
              <View key={i} style={styles.value}>
                <Text style={[styles.muted, { flex: 1 }]}>{v.label}</Text>
                <Text style={styles.bold}>{withUnit(v.value, v.unit)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    )
  })
}

// report: getHealthReportData() + { generatedAt, periodDescription, generatedBy }
export default function HealthReportDocument({ report }) {
  const { patient } = report
  const patientLine = [patient.age !== null && `${patient.age} anos`, patient.sexAssignedAtBirth, patient.cityState].filter(Boolean).join(' · ')
  const generatedAt = `${report.generatedAt.toLocaleDateString('pt-BR')} às ${report.generatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  return (
    <Document title={`Relatório de saúde · ${patient.fullName}`} author={report.generatedBy} language="pt-BR">
      <Page size="A4" style={styles.page}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.overline}>Relatório de saúde</Text>
              <Text style={styles.name}>{patient.fullName}</Text>
              {patientLine ? <Text style={styles.muted}>{patientLine}</Text> : null}
            </View>
            <View>
              <Text style={styles.meta}>Gerado em {generatedAt}</Text>
              <Text style={styles.meta}>Período: {report.periodDescription}</Text>
              <Text style={styles.meta}>Por {report.generatedBy}</Text>
            </View>
          </View>

          <Section title="Riscos"><Risks risks={report.risks} /></Section>
          <Section title="Indicadores"><Biomarkers biomarkers={report.biomarkers} /></Section>
          <Section title="Plano ativo"><Conducts conducts={report.activeConducts} /></Section>
          <Section title="Exames pedidos"><ExamRequests requests={report.openExamRequests} /></Section>
          <Section title="Resultados enviados"><Results results={report.results} /></Section>
        </View>

        <View style={styles.footer} fixed>
          <Text>Gerado a partir dos dados registrados no app. Não substitui a avaliação de um profissional de saúde.</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
