import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import PdfIcon from '@mui/icons-material/PictureAsPdfOutlined'
import ShareIcon from '@mui/icons-material/IosShareRounded'
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined'
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded'
import { Section, RowButton, BottomSheet, Segmented, FieldLabel } from './ui'
import { useToast } from './toastContext'
import { colors } from '../theme'
import { getHealthReportData, REPORT_PERIODS } from '../services/reportService'
import { formatCrm } from '../services/careTeamService'

// "relatorio-de-saude-maria-souza-2026-10-23.pdf"
function reportFileName(patientName, date) {
  const slug = (patientName || 'paciente').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return `relatorio-de-saude-${slug}-${day}.pdf`
}

function generatedByLabel(viewerProfile) {
  if (viewerProfile?.role === 'doctor') return [viewerProfile.fullName, formatCrm(viewerProfile)].filter(Boolean).join(' · ')
  return `${viewerProfile?.fullName || 'Paciente'} (paciente)`
}

function canShareFile(file) {
  try {
    return Boolean(file && navigator.canShare?.({ files: [file] }))
  } catch {
    return false
  }
}

function download(file) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// Generating and sharing are two taps on purpose: building the PDF takes a
// moment, and browsers (Safari above all) only open the share sheet straight
// from a tap, not after an await.
function ExportReportSheet({ open, onClose, patientId, viewerProfile }) {
  const toast = useToast()
  const [period, setPeriod] = useState('12m')
  const [generating, setGenerating] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')

  const close = () => {
    if (generating) return
    setFile(null)
    setError('')
    onClose()
  }

  const choosePeriod = (value) => {
    setPeriod(value)
    setFile(null) // the ready file was for the other period
  }

  const generate = async () => {
    const { months, description } = REPORT_PERIODS.find((p) => p.value === period)
    setError('')
    setGenerating(true)
    try {
      const [data, { pdf }, { default: HealthReportDocument }] = await Promise.all([
        getHealthReportData(patientId, { months }),
        import('@react-pdf/renderer'),
        import('./HealthReportPdf'),
      ])
      const generatedAt = new Date()
      const report = { ...data, generatedAt, periodDescription: description, generatedBy: generatedByLabel(viewerProfile) }
      const blob = await pdf(<HealthReportDocument report={report} />).toBlob()
      setFile(new File([blob], reportFileName(data.patient.fullName, generatedAt), { type: 'application/pdf' }))
    } catch {
      setError('Não foi possível gerar o relatório. Tente novamente.')
    } finally {
      setGenerating(false)
    }
  }

  const share = async () => {
    try {
      await navigator.share({ files: [file], title: 'Relatório de saúde' })
    } catch (err) {
      if (err?.name !== 'AbortError') setError('Não foi possível compartilhar. Use "Baixar".')
    }
  }

  const save = () => {
    download(file)
    toast('Relatório baixado')
  }

  const shareable = canShareFile(file)

  return (
    <BottomSheet open={open} onClose={close} title="Relatório de saúde" subtitle="Riscos, indicadores, plano e exames em um PDF.">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
        <Box>
          <FieldLabel>Histórico de</FieldLabel>
          <Segmented label="Período do relatório" options={REPORT_PERIODS} value={period} onChange={choosePeriod} />
          <Typography variant="caption" sx={{ color: colors.muted, display: 'block', mt: 1 }}>
            O período vale para indicadores e resultados. Riscos, plano e exames pedidos aparecem como estão hoje.
          </Typography>
        </Box>

        {file && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '16px', backgroundColor: colors.ground }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 800, color: colors.alert, flexShrink: 0 }}>
              PDF
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>{file.name}</Typography>
              <Typography variant="caption" sx={{ color: colors.muted }}>Pronto</Typography>
            </Box>
          </Box>
        )}

        {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

        {!file ? (
          <Button size="large" variant="contained" onClick={generate} disabled={generating} startIcon={generating ? <CircularProgress size={18} sx={{ color: 'inherit' }} /> : <PdfIcon />}>
            {generating ? 'Gerando…' : 'Gerar PDF'}
          </Button>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: shareable ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 1.25 }}>
            {shareable && <Button size="large" variant="contained" onClick={share} startIcon={<ShareIcon />}>Compartilhar</Button>}
            <Button size="large" variant={shareable ? 'outlined' : 'contained'} onClick={save} startIcon={<DownloadIcon />}>Baixar</Button>
          </Box>
        )}
      </Box>
    </BottomSheet>
  )
}

// A card row that opens the export sheet. Used on the patient's Saúde page
// (their own report) and on the doctor's patient hub.
// viewerProfile: who is exporting, named in the PDF.
export default function HealthReportRow({ patientId, viewerProfile, subtitle }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Section padded={false}>
        <RowButton onClick={() => setOpen(true)}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: colors.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PdfIcon sx={{ color: colors.brand, fontSize: 22 }} />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1">Relatório de saúde</Typography>
            <Typography variant="caption" sx={{ color: colors.muted }}>{subtitle}</Typography>
          </Box>
          <ChevronRightIcon sx={{ color: colors.subtle }} />
        </RowButton>
      </Section>
      <ExportReportSheet open={open} onClose={() => setOpen(false)} patientId={patientId} viewerProfile={viewerProfile} />
    </>
  )
}
