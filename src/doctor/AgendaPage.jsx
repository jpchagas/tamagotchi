import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Skeleton from '@mui/material/Skeleton'
import AddIcon from '@mui/icons-material/AddRounded'
import EventIcon from '@mui/icons-material/EventRounded'
import VideocamIcon from '@mui/icons-material/VideocamOutlined'
import PlaceIcon from '@mui/icons-material/PlaceOutlined'
import { Page, PageHeader, GroupLabel, Section, RowButton, Pill, BottomSheet, EmptyState } from '../components/ui'
import { useToast } from '../components/toastContext'
import { colors } from '../theme'
import { APPOINTMENT_STATUS, APPOINTMENT_MODES, formatAppointmentDate, isSameDay, cancelAppointment } from '../services/appointmentsService'

const DAYS_SHOWN = 14
const timeOf = (d) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

function AppointmentRow({ appointment, onOpen, showDate = false }) {
  const status = APPOINTMENT_STATUS[appointment.status]
  const ModeIcon = appointment.mode === 'telemedicina' ? VideocamIcon : PlaceIcon
  return (
    <RowButton onClick={() => onOpen(appointment)}>
      <Box sx={{ minWidth: 58, textAlign: 'center' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2 }}>{timeOf(appointment.startsAt)}</Typography>
        <Typography variant="caption" sx={{ color: colors.muted }}>{appointment.durationMin} min</Typography>
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap>{appointment.patientName}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: colors.muted }}>
          <ModeIcon sx={{ fontSize: 16 }} />
          <Typography variant="caption" noWrap>{showDate ? formatAppointmentDate(appointment.startsAt) : APPOINTMENT_MODES[appointment.mode]?.label}</Typography>
        </Box>
      </Box>
      <Pill tone={status.tone}>{status.short}</Pill>
    </RowButton>
  )
}

// One appointment: details and what the doctor can do with it.
function AppointmentSheet({ appointment, onClose, onReschedule, onOpenPatient }) {
  const toast = useToast()
  if (!appointment) return null
  const status = APPOINTMENT_STATUS[appointment.status]

  const cancel = async () => {
    try {
      await cancelAppointment(appointment.id)
      toast('Consulta cancelada')
      onClose()
    } catch {
      toast('Não foi possível cancelar. Tente novamente.')
    }
  }

  return (
    <BottomSheet open onClose={onClose} title={appointment.patientName} subtitle={formatAppointmentDate(appointment.startsAt)}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box><Pill tone={status.tone}>{status.label}</Pill></Box>
        <Typography variant="body2">
          {APPOINTMENT_MODES[appointment.mode]?.label} · {appointment.durationMin} min{appointment.location ? ` · ${appointment.location}` : ''}
        </Typography>
        {appointment.notes && <Typography variant="body2" sx={{ color: colors.muted }}>{appointment.notes}</Typography>}
        {appointment.status === 'reschedule_requested' && (
          <Box sx={{ p: 1.5, borderRadius: '14px', backgroundColor: colors.alertBg }}>
            <Typography variant="body2">Pediu para remarcar{appointment.rescheduleNote ? `: “${appointment.rescheduleNote}”` : '.'}</Typography>
          </Box>
        )}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1, mt: 1 }}>
          <Button variant="outlined" onClick={() => onOpenPatient({ patientId: appointment.patientId, patientName: appointment.patientName })}>Ver paciente</Button>
          {appointment.status !== 'cancelled' && <Button variant="contained" onClick={() => onReschedule(appointment)}>Remarcar</Button>}
        </Box>
        {appointment.status !== 'cancelled' && (
          <Button color="error" onClick={cancel}>Cancelar consulta</Button>
        )}
      </Box>
    </BottomSheet>
  )
}

export default function AgendaPage({ appointments, onNew, onReschedule, onOpenPatient }) {
  const [day, setDay] = useState(() => new Date())
  const [openId, setOpenId] = useState(null)

  const days = Array.from({ length: DAYS_SHOWN }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return d
  })
  const active = (appointments || []).filter((a) => a.status !== 'cancelled')
  const requests = active.filter((a) => a.status === 'reschedule_requested')
  const ofDay = (appointments || []).filter((a) => a.startsAt && isSameDay(a.startsAt, day))
  const open = (appointments || []).find((a) => a.id === openId)

  return (
    <Page>
      <PageHeader
        title="Agenda"
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={onNew} sx={{ borderRadius: 999 }}>Nova</Button>}
      />

      <Box role="group" aria-label="Dia" sx={{ display: 'flex', gap: 1, overflowX: 'auto', mx: -2.5, px: 2.5, pb: 0.5, scrollbarWidth: 'none' }}>
        {days.map((d) => {
          const on = isSameDay(d, day)
          const count = active.filter((a) => isSameDay(a.startsAt, d)).length
          return (
            <ButtonBase
              key={d.toISOString()}
              onClick={() => setDay(d)}
              aria-pressed={on}
              aria-label={`${d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}, ${count} consultas`}
              sx={{ flexDirection: 'column', gap: 0.25, minWidth: 54, py: 1, borderRadius: '16px', flexShrink: 0, backgroundColor: on ? colors.brand : colors.surface, color: on ? '#FFFFFF' : colors.ink, border: `1px solid ${on ? colors.brand : colors.line}` }}
            >
              <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8, textTransform: 'capitalize' }}>{d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: '1.125rem', lineHeight: 1.1 }}>{d.getDate()}</Typography>
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: count ? (on ? '#FFFFFF' : colors.brand) : 'transparent' }} />
            </ButtonBase>
          )
        })}
      </Box>

      {!appointments && [0, 1].map((i) => <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: '18px' }} />)}

      {requests.length > 0 && (
        <>
          <GroupLabel>Pedidos de remarcação</GroupLabel>
          <Section padded={false}>
            {requests.map((a) => <AppointmentRow key={a.id} appointment={a} onOpen={(x) => setOpenId(x.id)} showDate />)}
          </Section>
        </>
      )}

      {appointments && (
        <>
          <GroupLabel>{isSameDay(day, new Date()) ? 'Hoje' : day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</GroupLabel>
          {ofDay.length === 0 ? (
            <Section>
              <EmptyState icon={<EventIcon />} title="Nenhuma consulta neste dia" action={<Button variant="outlined" onClick={onNew}>Marcar consulta</Button>} />
            </Section>
          ) : (
            <Section padded={false}>
              {ofDay.map((a) => <AppointmentRow key={a.id} appointment={a} onOpen={(x) => setOpenId(x.id)} />)}
            </Section>
          )}
        </>
      )}

      <AppointmentSheet
        appointment={open}
        onClose={() => setOpenId(null)}
        onReschedule={(a) => { setOpenId(null); onReschedule(a) }}
        onOpenPatient={(p) => { setOpenId(null); onOpenPatient(p) }}
      />
    </Page>
  )
}
