import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import EventIcon from '@mui/icons-material/EventRounded'
import PlaceIcon from '@mui/icons-material/PlaceOutlined'
import VideocamIcon from '@mui/icons-material/VideocamOutlined'
import { Pill, BottomSheet, FieldLabel } from '../components/ui'
import { useToast } from '../components/toastContext'
import { colors, cardShadow } from '../theme'
import { APPOINTMENT_STATUS, APPOINTMENT_MODES, formatAppointmentDate, confirmAppointment, requestReschedule } from '../services/appointmentsService'

const isLink = (text) => /^https?:\/\//i.test(text || '')

// The patient's view of one appointment: when, with whom, where, and the
// two answers they can give (confirm / ask to reschedule).
export default function AppointmentCard({ appointment, compact = false }) {
  const toast = useToast()
  const [rescheduling, setRescheduling] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const status = APPOINTMENT_STATUS[appointment.status] || APPOINTMENT_STATUS.scheduled
  const tele = appointment.mode === 'telemedicina'
  const canAnswer = appointment.status === 'scheduled' || appointment.status === 'confirmed'

  const confirm = async () => {
    setBusy(true)
    try {
      await confirmAppointment(appointment.id)
      toast('Consulta confirmada')
    } catch {
      toast('Não foi possível confirmar. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  const sendReschedule = async () => {
    setBusy(true)
    try {
      await requestReschedule(appointment.id, note.trim())
      toast(`Pedido enviado para ${appointment.doctorName}`)
      setRescheduling(false)
      setNote('')
    } catch {
      toast('Não foi possível enviar o pedido. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box sx={{ backgroundColor: colors.surface, borderRadius: '22px', boxShadow: cardShadow, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '14px', backgroundColor: colors.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <EventIcon sx={{ color: colors.brand }} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {!compact && <Typography variant="overline" sx={{ color: colors.brand }}>Próxima consulta</Typography>}
          <Typography variant="subtitle1">{formatAppointmentDate(appointment.startsAt)}</Typography>
          <Typography variant="body2" sx={{ color: colors.muted }} noWrap>
            {[appointment.doctorName, appointment.doctorSpecialty].filter(Boolean).join(' · ')}
          </Typography>
        </Box>
        <Pill tone={status.tone}>{status.short}</Pill>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: colors.muted }}>
        {tele ? <VideocamIcon sx={{ fontSize: 18 }} /> : <PlaceIcon sx={{ fontSize: 18 }} />}
        <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
          {APPOINTMENT_MODES[appointment.mode]?.label}
          {appointment.location && !isLink(appointment.location) ? ` · ${appointment.location}` : ''}
        </Typography>
      </Box>
      {appointment.notes && <Typography variant="body2">{appointment.notes}</Typography>}
      {appointment.status === 'reschedule_requested' && (
        <Typography variant="body2" sx={{ color: colors.muted }}>
          Você pediu para remarcar{appointment.rescheduleNote ? `: “${appointment.rescheduleNote}”` : ''}. Aguarde o novo horário.
        </Typography>
      )}

      {(canAnswer || (tele && isLink(appointment.location))) && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          {tele && isLink(appointment.location) && appointment.status !== 'reschedule_requested' && (
            <Button variant="contained" href={appointment.location} target="_blank" rel="noopener noreferrer" startIcon={<VideocamIcon />} sx={{ flexGrow: 1 }}>
              Entrar na chamada
            </Button>
          )}
          {canAnswer && (
            <Button variant="outlined" onClick={() => setRescheduling(true)} disabled={busy} sx={{ flexGrow: 1 }}>Pedir remarcação</Button>
          )}
          {appointment.status === 'scheduled' && (
            <Button variant="contained" onClick={confirm} disabled={busy} sx={{ flexGrow: 1 }}>Confirmar</Button>
          )}
        </Box>
      )}

      <BottomSheet open={rescheduling} onClose={() => setRescheduling(false)} title="Pedir remarcação" subtitle={`${appointment.doctorName} vai propor um novo horário.`}>
        <FieldLabel htmlFor={`reschedule-${appointment.id}`} hint="(opcional)">Melhor dia ou horário para você</FieldLabel>
        <TextField id={`reschedule-${appointment.id}`} fullWidth multiline minRows={3} placeholder="Ex: prefiro de manhã, a partir de segunda" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button fullWidth size="large" variant="contained" onClick={sendReschedule} disabled={busy} sx={{ mt: 2 }}>Enviar pedido</Button>
      </BottomSheet>
    </Box>
  )
}
