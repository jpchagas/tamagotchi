import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import { Pill } from './ui'
import { formatMeasurement, formatRange, RANGE_FLAG_LABELS } from './uiHelpers'
import { colors } from '../theme'
import { isOutOfRange } from '../services/examReviewService'

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

function Row({ primary, secondary, trailing, alert }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{primary}</Typography>
        {secondary && <Typography variant="caption" sx={{ color: alert ? colors.alert : colors.muted, display: 'block' }}>{secondary}</Typography>}
      </Box>
      {trailing && (
        <Typography variant="body2" sx={{ fontWeight: 800, whiteSpace: 'nowrap', color: alert ? colors.alert : undefined }}>{trailing}</Typography>
      )}
    </Box>
  )
}

// Renders whatever the Cloud Function extracted for this item — medications
// (prescription), requestedExams (exam request) or extractedValues (result).
// Shows nothing while the item has no attached document.
// showReference: reference ranges and out-of-range flags on the values; the
// patient only gets them once the doctor has reviewed the result.
export function ExtractedDataPanel({ item, showReference = true }) {
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
          {showReference && extractedValues.some(isOutOfRange) && (
            <Typography variant="caption" sx={{ color: colors.muted, display: 'block', mb: 0.5 }}>
              Valores fora da referência estão destacados. Converse com seu médico sobre eles.
            </Typography>
          )}
          {extractedValues.map((v, i) => {
            const flagged = showReference && isOutOfRange(v)
            const range = showReference ? formatRange(v) : ''
            return (
              <Row
                key={i}
                primary={v.label}
                secondary={[range && `Ref.: ${range}`, flagged && RANGE_FLAG_LABELS[v.flag]].filter(Boolean).join(' · ')}
                trailing={`${flagged ? (v.flag === 'high' ? '↑ ' : '↓ ') : ''}${formatMeasurement(v.value, v.unit)}`}
                alert={flagged}
              />
            )
          })}
        </Section>
      )}
    </>
  )
}
