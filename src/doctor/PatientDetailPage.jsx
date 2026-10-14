import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import MedicationIcon from '@mui/icons-material/MedicationOutlined'
import ScienceIcon from '@mui/icons-material/ScienceOutlined'
import PhoneIcon from '@mui/icons-material/PhoneOutlined'
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined'
import ReviewCard from './ReviewCard'
import SendPrescriptionPage from './SendPrescriptionPage'
import RequestExamPage from './RequestExamPage'
import { Page, PageHeader, Section, GroupLabel, PersonAvatar, Pill, RiskIcon, Sparkline, TextAction } from '../components/ui'
import { TONES, changeTone, changeLabel } from '../components/uiHelpers'
import { ProcessingStatusChip } from '../components/DocumentProcessing'
import { colors } from '../theme'
import { getUserProfile } from '../services/profileService'
import { subscribeToExams, formatRelativeDate } from '../services/examsService'
import { subscribeToConducts } from '../services/conductsService'
import { getBiomarkersGrouped, getBiomarkerTypes, computeChange } from '../services/biomarkersService'
import { getLatestRisks, riskTypeLabel, formatRiskValue, riskTone } from '../services/risksService'
import { formatTimeAgo } from '../services/dateUtils'

const INDICATOR_PREVIEW_COUNT = 5
const formatNumber = (v) => String(v).replace('.', ',')

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (isNaN(dob)) return null
  return Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
}

function ItemRow({ title, meta, trailing, href }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, borderBottom: `1px solid ${colors.line}`, '&:last-of-type': { borderBottom: 'none' } }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap>{title}</Typography>
        {meta && <Typography variant="caption" sx={{ color: colors.muted }}>{meta}</Typography>}
      </Box>
      {trailing}
      {href && (
        <IconButton href={href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir arquivo: ${title}`} size="small">
          <DescriptionIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  )
}

// The doctor's hub for one patient: act (prescribe, request, review) and
// see their state, without going back to a list.
export default function PatientDetailPage({ doctorUid, doctorProfile, patientUid, patientName, onBack }) {
  const [mode, setMode] = useState(null) // 'prescription' | 'exam'
  const [profile, setProfile] = useState(null)
  const [exams, setExams] = useState(null)
  const [conducts, setConducts] = useState(null)
  const [indicators, setIndicators] = useState(null)
  const [risks, setRisks] = useState(null)
  const [showAllIndicators, setShowAllIndicators] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!patientUid) return
    let cancelled = false
    const onError = () => setError('Não foi possível carregar os dados deste paciente.')

    Promise.all([getUserProfile(patientUid), getBiomarkersGrouped(patientUid), getBiomarkerTypes(), getLatestRisks(patientUid)])
      .then(([profileData, grouped, types, latestRisks]) => {
        if (cancelled) return
        setProfile(profileData)
        setRisks(latestRisks)
        setIndicators(
          Object.entries(grouped)
            .map(([key, readings]) => ({
              key,
              label: types[key]?.label || key,
              unit: types[key]?.unit || readings[readings.length - 1].unit || '',
              latest: readings[readings.length - 1],
              values: readings.slice(-8).map((r) => r.value),
              change: computeChange(readings, types[key]?.goodDirection),
            }))
            .sort((a, b) => b.latest.recordedAt - a.latest.recordedAt)
        )
      })
      .catch(onError)

    // Live, so a prescription just sent shows its extraction status here.
    const unsubscribeExams = subscribeToExams(patientUid, setExams, onError)
    const unsubscribeConducts = subscribeToConducts(patientUid, setConducts, onError)
    return () => {
      cancelled = true
      unsubscribeExams()
      unsubscribeConducts()
    }
  }, [patientUid])

  const patient = { patientId: patientUid, patientName: profile?.fullName || patientName }

  if (mode === 'prescription') {
    return <SendPrescriptionPage doctorUid={doctorUid} doctorProfile={doctorProfile} patient={patient} onBack={() => setMode(null)} onSent={() => setMode(null)} />
  }
  if (mode === 'exam') {
    return <RequestExamPage doctorUid={doctorUid} doctorProfile={doctorProfile} patient={patient} onBack={() => setMode(null)} onSent={() => setMode(null)} />
  }

  const age = calculateAge(profile?.dateOfBirth)
  const results = (exams || []).filter((e) => e.kind === 'result').sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))
  const toReview = results.filter((r) => r.doctorId === doctorUid && r.reviewStatus === 'not_reviewed')
  const pastResults = results.filter((r) => !toReview.includes(r))
  const openRequests = (exams || []).filter((e) => e.kind !== 'result' && e.status !== 'realizado')
  const activeConducts = (conducts || []).filter((c) => c.status !== 'done')
  const shownIndicators = showAllIndicators ? indicators || [] : (indicators || []).slice(0, INDICATOR_PREVIEW_COUNT)

  return (
    <Page bottomSpace={4}>
      <PageHeader onBack={onBack} title="" />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
        <PersonAvatar name={patient.patientName} size={60} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="h5" component="h1">{patient.patientName}</Typography>
          {profile ? (
            <Typography variant="body2" sx={{ color: colors.muted }}>
              {[age ? `${age} anos` : null, profile.sexAssignedAtBirth, profile.cityState].filter(Boolean).join(' · ')}
            </Typography>
          ) : (
            <Skeleton width={160} />
          )}
        </Box>
        {profile?.phone && (
          <IconButton component="a" href={`tel:${profile.phone.replace(/[^\d+]/g, '')}`} aria-label={`Ligar para ${patient.patientName}`} sx={{ width: 44, height: 44, backgroundColor: colors.brandTint, color: colors.brand }}>
            <PhoneIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
        <Button size="large" variant="contained" startIcon={<MedicationIcon />} onClick={() => setMode('prescription')}>Enviar receita</Button>
        <Button size="large" variant="outlined" startIcon={<ScienceIcon />} onClick={() => setMode('exam')} sx={{ backgroundColor: colors.surface }}>Pedir exame</Button>
      </Box>

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

      {toReview.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <GroupLabel>Para revisar ({toReview.length})</GroupLabel>
          {toReview.map((r) => <ReviewCard key={r.id} review={r} showPatient={false} />)}
        </Box>
      )}

      <Section title="Riscos" padded={false}>
        {!risks && <Box sx={{ px: 1.5, pb: 1.5 }}><Skeleton height={44} /><Skeleton height={44} /></Box>}
        {risks && risks.length === 0 && <Typography variant="body2" sx={{ color: colors.muted, px: 1.5, pb: 1.5 }}>Nenhum risco calculado.</Typography>}
        {risks?.map((r) => (
          <Box key={r.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1 }}>
            <RiskIcon riskType={r.riskType} tone={riskTone(r)} size={32} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle1">{riskTypeLabel(r.riskType)}</Typography>
              {r.model && <Typography variant="caption" sx={{ color: colors.muted }}>{r.model}</Typography>}
            </Box>
            <Pill tone={riskTone(r)}>{formatRiskValue(r)}</Pill>
          </Box>
        ))}
        <Box sx={{ height: 8 }} />
      </Section>

      <Section
        title="Indicadores"
        padded={false}
        action={indicators && indicators.length > INDICATOR_PREVIEW_COUNT && (
          <TextAction onClick={() => setShowAllIndicators((v) => !v)}>{showAllIndicators ? 'Mostrar menos' : `Ver todos (${indicators.length})`}</TextAction>
        )}
      >
        {!indicators && <Box sx={{ px: 1.5, pb: 1.5 }}><Skeleton height={44} /><Skeleton height={44} /></Box>}
        {indicators && indicators.length === 0 && <Typography variant="body2" sx={{ color: colors.muted, px: 1.5, pb: 1.5 }}>Nenhum indicador registrado ainda.</Typography>}
        {shownIndicators.map((ind) => {
          const tone = TONES[changeTone(ind.change)]
          return (
            <Box key={ind.key} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" noWrap>{ind.label}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700, color: tone.color }}>{ind.change ? changeLabel(ind.change) : formatTimeAgo(ind.latest.recordedAt)}</Typography>
              </Box>
              <Sparkline values={ind.values} width={64} height={24} color={tone.color} />
              <Typography sx={{ fontWeight: 800, minWidth: 76, textAlign: 'right' }}>
                {formatNumber(ind.latest.value)}<Box component="span" sx={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.muted }}> {ind.unit}</Box>
              </Typography>
            </Box>
          )
        })}
        <Box sx={{ height: 8 }} />
      </Section>

      <Section title="Plano ativo">
        {!conducts && <Skeleton height={44} />}
        {conducts && activeConducts.length === 0 && <Typography variant="body2" sx={{ color: colors.muted }}>Nenhuma orientação ativa.</Typography>}
        {activeConducts.map((c) => (
          <ItemRow key={c.id} title={c.title} meta={[formatRelativeDate(c.dueDate), c.doctorName].filter(Boolean).join(' · ')} trailing={<ProcessingStatusChip status={c.processingStatus} />} href={c.attachmentUrl} />
        ))}
      </Section>

      {openRequests.length > 0 && (
        <Section title="Exames pedidos">
          {openRequests.map((e) => (
            <ItemRow key={e.id} title={e.title} meta={[`Fazer ${formatRelativeDate(e.scheduledDate).toLowerCase()}`, e.priority === 'prioritario' ? 'prioritário' : null].filter(Boolean).join(' · ')} trailing={<ProcessingStatusChip status={e.processingStatus} />} href={e.attachmentUrl} />
          ))}
        </Section>
      )}

      {pastResults.length > 0 && (
        <Section title="Resultados anteriores">
          {pastResults.map((r) => (
            <ItemRow key={r.id} title={r.title} meta={`${formatTimeAgo(r.submittedAt)}${r.doctorId !== doctorUid ? ` · para ${r.doctorName}` : ''}`} trailing={r.reviewStatus === 'reviewed' ? <Pill tone="good">Revisado</Pill> : null} href={r.attachmentUrl} />
          ))}
        </Section>
      )}
    </Page>
  )
}
