import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined'
import { PersonAvatar } from '../components/ui'
import { ProcessingStatusChip } from '../components/DocumentProcessing'
import { useToast } from '../components/toastContext'
import { colors, cardShadow } from '../theme'
import { setExamReviewed } from '../services/examReviewService'
import { formatTimeAgo } from '../services/dateUtils'

const formatValue = (v) => `${String(v.value).replace('.', ',')}${v.unit ? ` ${v.unit}` : ''}`

// A patient's submitted result waiting for review. Used on the dashboard,
// the Exames tab and the patient hub, so reviewing works the same anywhere.
// showPatient: header with the patient (tap opens the patient hub).
export default function ReviewCard({ review, showPatient = true, onOpenPatient, compact = false }) {
  const toast = useToast()
  const values = review.extractedValues || []
  const shown = compact ? values.slice(0, 3) : values

  const markReviewed = async () => {
    try {
      await setExamReviewed(review.id, true)
      toast(`${review.title} revisado`, { action: { label: 'Desfazer', onClick: () => setExamReviewed(review.id, false) } })
    } catch {
      toast('Não foi possível marcar como revisado. Tente novamente.')
    }
  }

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
      {showPatient && <PersonAvatar name={review.patientName} />}
      <Box sx={{ flexGrow: 1, minWidth: 0, textAlign: 'left' }}>
        <Typography variant="subtitle1" noWrap>{showPatient ? review.patientName : review.title}</Typography>
        <Typography variant="body2" sx={{ color: colors.muted }} noWrap>
          {showPatient ? `${review.title} · ` : ''}enviado {formatTimeAgo(review.submittedAt)}
        </Typography>
      </Box>
    </Box>
  )
  // Once the values are extracted they speak for themselves; until then
  // (or on failure) the status gets its own line.
  const showStatus = review.processingStatus && review.processingStatus !== 'completed'

  return (
    <Box sx={{ backgroundColor: colors.surface, borderRadius: '22px', boxShadow: cardShadow, p: 1.75, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {showPatient && onOpenPatient ? (
        <ButtonBase onClick={() => onOpenPatient({ patientId: review.patientId, patientName: review.patientName })} sx={{ borderRadius: 3, justifyContent: 'flex-start' }}>
          {header}
        </ButtonBase>
      ) : header}
      {showStatus && <Box><ProcessingStatusChip status={review.processingStatus} /></Box>}

      {shown.length > 0 && (
        compact ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
            {shown.map((v, i) => (
              <Box key={i} sx={{ backgroundColor: colors.ground, borderRadius: '12px', px: 1.25, py: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: colors.muted, fontWeight: 600, display: 'block' }} noWrap>{v.label}</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '0.9375rem' }} noWrap>{formatValue(v)}</Typography>
              </Box>
            ))}
          </Box>
        ) : (
          <Box>
            {shown.map((v, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.9, borderBottom: `1px solid ${colors.line}`, '&:last-of-type': { borderBottom: 'none' } }}>
                <Typography variant="body2" sx={{ color: colors.muted }}>{v.label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatValue(v)}</Typography>
              </Box>
            ))}
          </Box>
        )
      )}
      {compact && values.length > shown.length && (
        <Typography variant="caption" sx={{ color: colors.muted }}>+ {values.length - shown.length} valores</Typography>
      )}

      {review.reviewStatus !== 'reviewed' && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {review.attachmentUrl && (
            <Button variant="outlined" href={review.attachmentUrl} target="_blank" rel="noopener noreferrer" startIcon={<DescriptionIcon />}>Arquivo</Button>
          )}
          <Button variant="contained" onClick={markReviewed} sx={{ flexGrow: 1, backgroundColor: colors.ink, '&:hover': { backgroundColor: '#3A3046' } }}>
            Marcar como revisado
          </Button>
        </Box>
      )}
    </Box>
  )
}
