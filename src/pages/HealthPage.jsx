import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Skeleton from '@mui/material/Skeleton'
import WarningIcon from '@mui/icons-material/WarningAmberRounded'
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded'
import ExpandMoreIcon from '@mui/icons-material/ExpandMoreRounded'
import EventIcon from '@mui/icons-material/EventAvailableRounded'
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import InsightsIcon from '@mui/icons-material/InsightsRounded'
import AccountMenu from '../components/AccountMenu'
import NotificationBell from '../components/Notifications'
import AppointmentCard from './AppointmentCard'
import HealthReportRow from '../components/HealthReport'
import { useToast } from '../components/toastContext'
import { Page, PageHeader, Section, RowButton, Pill, RiskIcon, Sparkline, EmptyState, TextAction } from '../components/ui'
import { TONES, changeTone, changeLabel } from '../components/uiHelpers'
import { colors, cardShadow } from '../theme'
import { getBiomarkersGrouped, getBiomarkerTypes, computeChange } from '../services/biomarkersService'
import { getLatestRisks, riskTypeLabel, formatRiskValue, riskTone } from '../services/risksService'
import { subscribeToConducts, getNextPendingConduct, setConductDone, formatRelativeDate } from '../services/conductsService'
import { upcomingAppointments } from '../services/appointmentsService'

// "O que mudou": the biomarkers whose latest reading is most recent, among
// those with at least two readings to compare.
const CHANGE_TILE_COUNT = 3

function recentChanges(readingsByType, biomarkerTypes) {
  return Object.entries(readingsByType)
    .map(([key, readings]) => {
      const type = biomarkerTypes[key]
      const change = computeChange(readings, type?.goodDirection)
      return change && {
        key,
        label: type?.label || key,
        unit: type?.unit || readings[readings.length - 1].unit || '',
        values: readings.slice(-6).map((r) => r.value),
        change,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.change.latest.recordedAt - a.change.latest.recordedAt)
    .slice(0, CHANGE_TILE_COUNT)
}

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function today() {
  const text = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const formatNumber = (v) => String(v).replace('.', ',')

export default function HealthPage({ uid, profile, onLogout, appointments, onNotification, onOpenRisk, onOpenBiomarker, onOpenPlan }) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [conducts, setConducts] = useState(null)
  const [error, setError] = useState('')
  const [showLowRisks, setShowLowRisks] = useState(false)

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    Promise.all([getLatestRisks(uid), getBiomarkersGrouped(uid), getBiomarkerTypes()])
      .then(([risks, readingsByType, biomarkerTypes]) => {
        if (!cancelled) setData({ risks, changes: recentChanges(readingsByType, biomarkerTypes) })
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar seus dados de saúde.')
      })
    // Live, so "Feito" (here or in Plano) updates the next action at once.
    const unsubscribe = subscribeToConducts(uid, setConducts, () => setError('Não foi possível carregar seu plano.'))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [uid])

  const loading = !data && !error
  const firstName = profile?.fullName?.split(' ')[0] || ''
  const highRisks = (data?.risks || []).filter((r) => r.category === 'alto')
  const shownRisks = (data?.risks || []).filter((r) => showLowRisks || r.category !== 'baixo')
  const hiddenLowCount = (data?.risks || []).length - shownRisks.length
  const nextConduct = conducts ? getNextPendingConduct(conducts) : null
  const nextAppointment = appointments ? upcomingAppointments(appointments)[0] : null

  const markDone = async (conduct) => {
    try {
      await setConductDone(conduct.id, true)
      toast('Marcado como feito', { action: { label: 'Desfazer', onClick: () => setConductDone(conduct.id, false) } })
    } catch {
      toast('Não foi possível atualizar. Tente novamente.')
    }
  }

  return (
    <Page bottomSpace={22}>
      <PageHeader
        overline={today()}
        title={`${greeting()}${firstName ? `, ${firstName}` : ''}`}
        actions={
          <>
            <NotificationBell uid={uid} onNavigate={onNotification} />
            <AccountMenu profile={profile} onLogout={onLogout} />
          </>
        }
      />

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

      {highRisks.length > 0 && (
        <ButtonBase onClick={() => onOpenRisk(highRisks[0].riskType)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, borderRadius: '18px', backgroundColor: colors.alertBg, textAlign: 'left', justifyContent: 'flex-start' }}>
          <Box sx={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <WarningIcon sx={{ color: colors.alert, fontSize: 20 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1">
              {highRisks.length} {highRisks.length > 1 ? 'áreas precisam' : 'área precisa'} da sua atenção
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B2A24' }}>
              Risco {riskTypeLabel(highRisks[0].riskType).toLowerCase()} alto · ver o que fazer
            </Typography>
          </Box>
          <ChevronRightIcon sx={{ color: '#6B2A24' }} />
        </ButtonBase>
      )}

      {nextAppointment && <AppointmentCard appointment={nextAppointment} />}

      <Section title="Sua saúde hoje" padded={false}>
        {loading && <Box sx={{ px: 1.5, pb: 1.5 }}>{[0, 1, 2].map((i) => <Skeleton key={i} height={52} />)}</Box>}
        {data && data.risks.length === 0 && (
          <EmptyState icon={<InsightsIcon />} title="Seus riscos aparecem aqui">
            Envie seus exames: com eles sua equipe acompanha seus riscos de saúde.
          </EmptyState>
        )}
        {shownRisks.map((risk) => (
          <RowButton key={risk.id} onClick={() => onOpenRisk(risk.riskType)}>
            <RiskIcon riskType={risk.riskType} tone={riskTone(risk)} />
            <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{riskTypeLabel(risk.riskType)}</Typography>
            <Pill tone={riskTone(risk)}>{formatRiskValue(risk)}</Pill>
          </RowButton>
        ))}
        {hiddenLowCount > 0 && (
          <RowButton onClick={() => setShowLowRisks(true)} sx={{ minHeight: 48, color: colors.muted }}>
            <Typography variant="body2" sx={{ fontWeight: 700, flexGrow: 1, pl: '48px' }}>
              + {hiddenLowCount} {hiddenLowCount > 1 ? 'áreas' : 'área'} com risco baixo
            </Typography>
            <ExpandMoreIcon />
          </RowButton>
        )}
      </Section>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5 }}>
          <Typography variant="h6" component="h2">O que mudou</Typography>
          {data?.changes.length > 0 && <TextAction onClick={() => onOpenBiomarker(null)}>Ver evolução</TextAction>}
        </Box>
        {loading && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.25 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={124} sx={{ borderRadius: '18px' }} />)}
          </Box>
        )}
        {data && data.changes.length === 0 && (
          <Typography variant="body2" sx={{ color: colors.muted, px: 0.5 }}>
            Assim que houver duas medições de um mesmo indicador, a mudança aparece aqui.
          </Typography>
        )}
        {data && data.changes.length > 0 && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.25 }}>
            {data.changes.map(({ key, label, unit, values, change }) => {
              const tone = TONES[changeTone(change)]
              return (
                <ButtonBase key={key} onClick={() => onOpenBiomarker(key)} sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0.75, p: 1.5, borderRadius: '18px', backgroundColor: colors.surface, boxShadow: cardShadow, textAlign: 'left', minWidth: 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: colors.muted }} noWrap>{label}</Typography>
                  <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, lineHeight: 1.1 }}>
                    {formatNumber(change.latest.value)} <Box component="span" sx={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.muted }}>{unit}</Box>
                  </Typography>
                  <Box sx={{ width: '100%', overflow: 'hidden' }}><Sparkline values={values} width={86} height={22} color={tone.color} /></Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: tone.color }}>{changeLabel(change)}</Typography>
                </ButtonBase>
              )
            })}
          </Box>
        )}
      </Box>

      <Section>
        {!conducts ? (
          <Skeleton height={56} />
        ) : nextConduct ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '14px', backgroundColor: colors.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <EventIcon sx={{ color: colors.brand }} />
            </Box>
            <ButtonBase onClick={onOpenPlan} sx={{ flexDirection: 'column', alignItems: 'flex-start', flexGrow: 1, minWidth: 0, textAlign: 'left', borderRadius: 2 }}>
              <Typography variant="overline" sx={{ color: colors.brand }}>Próxima ação · {formatRelativeDate(nextConduct.dueDate)}</Typography>
              <Typography variant="subtitle1">{nextConduct.title}</Typography>
            </ButtonBase>
            <Button variant="outlined" onClick={() => markDone(nextConduct)} sx={{ flexShrink: 0 }}>Feito</Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '14px', backgroundColor: colors.goodBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircleIcon sx={{ color: colors.good }} />
            </Box>
            <Box>
              <Typography variant="subtitle1">Tudo em dia</Typography>
              <Typography variant="body2" sx={{ color: colors.muted }}>Nenhuma ação pendente no seu plano.</Typography>
            </Box>
          </Box>
        )}
      </Section>

      <HealthReportRow patientId={uid} viewerProfile={profile} subtitle="PDF para levar à consulta ou enviar à sua equipe" />
    </Page>
  )
}
