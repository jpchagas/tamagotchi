import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import Skeleton from '@mui/material/Skeleton'
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded'
import TaskAltIcon from '@mui/icons-material/TaskAltRounded'
import AccountMenu from '../components/AccountMenu'
import NotificationBell from '../components/Notifications'
import ReviewCard from './ReviewCard'
import { Page, PageHeader, Section, RowButton, RiskIcon, TextAction, EmptyState, Pill } from '../components/ui'
import { colors, cardShadow } from '../theme'
import { getDoctorPatients } from '../services/careTeamService'
import { getLatestRisksForPatients, riskTypeLabel } from '../services/risksService'
import { APPOINTMENT_STATUS, isSameDay } from '../services/appointmentsService'

const REVIEW_PREVIEW_COUNT = 3

function greetingName(fullName = '') {
  const words = fullName.trim().split(/\s+/)
  // Keep the title with the first name: "Dr. Ricardo", "Dra. Ana".
  return /^(dr|dra)\.?$/i.test(words[0]) && words[1] ? `${words[0]} ${words[1]}` : words[0] || ''
}

function today() {
  const text = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function Stat({ value, label, onClick, highlight, tone }) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0.5, p: 1.75, borderRadius: '20px', textAlign: 'left', minWidth: 0, backgroundColor: highlight ? colors.brand : colors.surface, color: highlight ? '#FFFFFF' : colors.ink, boxShadow: highlight ? 'none' : cardShadow }}
    >
      <Typography sx={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1, color: tone || 'inherit' }}>{value}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.3, color: highlight ? 'inherit' : colors.muted }}>{label}</Typography>
    </ButtonBase>
  )
}

export default function DoctorHomePage({ uid, profile, onLogout, reviews, appointments, incomingRequestsCount, onNotification, onOpenPatient, onOpenExams, onOpenAgenda, onOpenPatients }) {
  const [highRisks, setHighRisks] = useState(null)

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    getDoctorPatients(uid)
      .then(async (links) => {
        const confirmed = links.filter((l) => l.status === 'confirmed')
        const names = Object.fromEntries(confirmed.map((l) => [l.patientId, l.patientName]))
        const risks = confirmed.length > 0 ? await getLatestRisksForPatients(confirmed.map((l) => l.patientId)) : []
        if (!cancelled) {
          setHighRisks(risks.filter((r) => r.category === 'alto').map((r) => ({ ...r, patientName: names[r.patientId] })))
        }
      })
      .catch(() => !cancelled && setHighRisks([]))
    return () => {
      cancelled = true
    }
  }, [uid])

  const pending = (reviews || []).filter((r) => r.reviewStatus === 'not_reviewed')
  const highRiskPatients = new Set((highRisks || []).map((r) => r.patientId)).size
  const show = (n, ready) => (ready ? String(n) : '—')
  const todaysAppointments = (appointments || []).filter((a) => a.status !== 'cancelled' && a.startsAt && isSameDay(a.startsAt, new Date()))

  return (
    <Page>
      <PageHeader
        overline={today()}
        title={`Olá${profile?.fullName ? `, ${greetingName(profile.fullName)}` : ''}`}
        actions={
          <>
            <NotificationBell uid={uid} onNavigate={onNotification} />
            <AccountMenu profile={profile} onLogout={onLogout} />
          </>
        }
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
        <Stat highlight value={show(pending.length, reviews)} label={pending.length === 1 ? 'exame a revisar' : 'exames a revisar'} onClick={onOpenExams} />
        <Stat value={show(todaysAppointments.length, appointments)} label={todaysAppointments.length === 1 ? 'consulta hoje' : 'consultas hoje'} onClick={onOpenAgenda} />
        <Stat value={show(highRiskPatients, highRisks)} label={highRiskPatients === 1 ? 'paciente com risco alto' : 'pacientes com risco alto'} tone={highRiskPatients ? colors.alert : undefined} onClick={() => onOpenPatients('alertas')} />
        <Stat value={String(incomingRequestsCount)} label={incomingRequestsCount === 1 ? 'pedido de vínculo' : 'pedidos de vínculo'} onClick={() => onOpenPatients('todos')} />
      </Box>

      {todaysAppointments.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5 }}>
            <Typography variant="h6" component="h2">Consultas de hoje</Typography>
            <TextAction onClick={onOpenAgenda}>Agenda</TextAction>
          </Box>
          <Section padded={false}>
            {todaysAppointments.map((a) => (
              <RowButton key={a.id} onClick={() => onOpenPatient({ patientId: a.patientId, patientName: a.patientName })}>
                <Typography sx={{ fontWeight: 800, minWidth: 52 }}>{a.startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Typography>
                <Typography variant="subtitle1" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>{a.patientName}</Typography>
                <Pill tone={APPOINTMENT_STATUS[a.status].tone}>{APPOINTMENT_STATUS[a.status].short}</Pill>
              </RowButton>
            ))}
          </Section>
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5 }}>
          <Typography variant="h6" component="h2">Para revisar</Typography>
          {pending.length > REVIEW_PREVIEW_COUNT && <TextAction onClick={onOpenExams}>Ver todos ({pending.length})</TextAction>}
        </Box>
        {!reviews && [0, 1].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: '22px' }} />)}
        {reviews && pending.length === 0 && (
          <Section>
            <EmptyState icon={<TaskAltIcon />} title="Nada para revisar">Quando um paciente enviar um resultado, ele aparece aqui.</EmptyState>
          </Section>
        )}
        {pending.slice(0, REVIEW_PREVIEW_COUNT).map((r) => (
          <ReviewCard key={r.id} review={r} compact onOpenPatient={onOpenPatient} />
        ))}
      </Box>

      {highRisks && highRisks.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          <Typography variant="h6" component="h2" sx={{ px: 0.5 }}>Atenção</Typography>
          <Section padded={false}>
            {highRisks.map((r) => (
              <RowButton key={r.id} onClick={() => onOpenPatient({ patientId: r.patientId, patientName: r.patientName })}>
                <RiskIcon riskType={r.riskType} tone="alert" size={44} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1">Risco {riskTypeLabel(r.riskType).toLowerCase()} alto</Typography>
                  <Typography variant="body2" sx={{ color: colors.muted }} noWrap>{r.patientName}</Typography>
                </Box>
                <ChevronRightIcon sx={{ color: colors.muted }} />
              </RowButton>
            ))}
          </Section>
        </Box>
      )}
    </Page>
  )
}
