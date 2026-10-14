import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { Pill } from './ui'
import { colors } from '../theme'

// Shared by patient (PlanPage) and doctor (ExamesPage, PatientDetailPage)
// screens so a document reads the same way on both sides.

const STATUS = {
  pending: { label: 'Lendo documento', tone: 'brand', spinning: true },
  processing: { label: 'Lendo documento', tone: 'brand', spinning: true },
  completed: { label: 'Dados extraídos', tone: 'good' },
  failed: { label: 'Leitura falhou', tone: 'alert' },
}

const ERROR_MESSAGES = {
  upload_failed: 'O arquivo não chegou a ser enviado. Envie novamente.',
  file_too_large: 'O arquivo é maior que 14 MB.',
  unsupported_type: 'Formato não suportado. Use PDF, PNG ou JPG.',
  extraction_failed: 'Não foi possível ler este documento. O arquivo original continua disponível.',
}

export function ProcessingStatusChip({ status }) {
  const style = STATUS[status]
  if (!style) return null
  return (
    <Pill tone={style.tone}>
      {style.spinning && <CircularProgress size={10} thickness={6} sx={{ color: 'inherit' }} />}
      {style.label}
    </Pill>
  )
}

function Section({ title, children }) {
  return (
    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${colors.line}` }}>
      <Typography variant="overline" sx={{ color: colors.muted, display: 'block', mb: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  )
}

function Row({ primary, secondary, trailing }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{primary}</Typography>
        {secondary && <Typography variant="caption" sx={{ color: colors.muted }}>{secondary}</Typography>}
      </Box>
      {trailing && (
        <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>{trailing}</Typography>
      )}
    </Box>
  )
}

// Renders whatever the Cloud Function extracted for this item — medications
// (prescription), requestedExams (exam request) or extractedValues (result).
// Shows nothing while the item has no attached document.
export function ExtractedDataPanel({ item }) {
  const status = item.processingStatus
  if (!status) return null

  if (status === 'failed') {
    return (
      <Typography variant="caption" sx={{ color: colors.alert, display: 'block', mt: 1 }}>
        {ERROR_MESSAGES[item.processingError] || ERROR_MESSAGES.extraction_failed}
      </Typography>
    )
  }

  if (status !== 'completed') return null

  const medications = item.medications || []
  const requestedExams = item.requestedExams || []
  const extractedValues = item.extractedValues || []

  if (medications.length === 0 && requestedExams.length === 0 && extractedValues.length === 0) {
    return (
      <Typography variant="caption" sx={{ color: colors.muted, display: 'block', mt: 1 }}>
        Nenhum dado estruturado foi encontrado no documento.
      </Typography>
    )
  }

  return (
    <>
      {medications.length > 0 && (
        <Section title="Medicamentos">
          {medications.map((m, i) => (
            <Row key={i} primary={[m.name, m.dosage].filter(Boolean).join(' ')} secondary={m.instructions} />
          ))}
        </Section>
      )}
      {requestedExams.length > 0 && (
        <Section title="Exames solicitados">
          {requestedExams.map((e, i) => (
            // Tolerates the older string-only shape too.
            <Row key={i} primary={typeof e === 'string' ? e : e.name} secondary={typeof e === 'string' ? '' : e.notes} />
          ))}
        </Section>
      )}
      {extractedValues.length > 0 && (
        <Section title="Valores identificados">
          {extractedValues.map((v, i) => (
            <Row key={i} primary={v.label} trailing={`${String(v.value).replace('.', ',')}${v.unit ? ` ${v.unit}` : ''}`} />
          ))}
        </Section>
      )}
    </>
  )
}
