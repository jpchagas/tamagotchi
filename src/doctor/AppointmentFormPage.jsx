import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Skeleton from '@mui/material/Skeleton'
import { Page, PageHeader, FieldLabel, ChoiceChips, Segmented, ActionBar } from '../components/ui'
import { useToast } from '../components/toastContext'
import { colors } from '../theme'
import { getDoctorPatients } from '../services/careTeamService'
import { createAppointment, rescheduleAppointment, formatAppointmentDate } from '../services/appointmentsService'

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 h' },
]

const MODES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'telemedicina', label: 'Telemedicina' },
]

const pad = (n) => String(n).padStart(2, '0')
const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

function defaultStart() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(9, 0, 0, 0)
  return d
}

// New appointment, or a reschedule when `appointment` is given. Without a
// `patient` the doctor picks one of their confirmed patients.
export default function AppointmentFormPage({ doctorUid, doctorProfile, patient, appointment, onBack, onSaved }) {
  const toast = useToast()
  const editing = Boolean(appointment)
  const start = appointment?.startsAt || defaultStart()
  const [patients, setPatients] = useState(null)
  const [patientId, setPatientId] = useState(patient?.patientId || appointment?.patientId || null)
  const [date, setDate] = useState(toDateInput(start))
  const [time, setTime] = useState(toTimeInput(start))
  const [durationMin, setDurationMin] = useState(appointment?.durationMin || 30)
  const [mode, setMode] = useState(appointment?.mode || 'presencial')
  const [location, setLocation] = useState(appointment?.location || '')
  const [notes, setNotes] = useState(appointment?.notes || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const pickPatient = !patient && !editing

  useEffect(() => {
    if (!pickPatient) return
    getDoctorPatients(doctorUid)
      .then((links) => setPatients(links.filter((l) => l.status === 'confirmed')))
      .catch(() => setPatients([]))
  }, [pickPatient, doctorUid])

  const patientName = patient?.patientName || appointment?.patientName || patients?.find((p) => p.patientId === patientId)?.patientName

  const save = async () => {
    const startsAt = new Date(`${date}T${time}`)
    if (!patientId) return setError('Escolha o paciente.')
    if (isNaN(startsAt)) return setError('Informe data e horário.')
    if (startsAt < new Date()) return setError('Escolha um horário no futuro.')
    setError('')
    setSaving(true)
    try {
      const details = { startsAt, durationMin, mode, location: location.trim(), notes: notes.trim() }
      if (editing) await rescheduleAppointment(appointment.id, details)
      else await createAppointment({ ...details, patientId, patientName, doctorId: doctorUid, doctorProfile })
      toast(`${editing ? 'Remarcada' : 'Consulta marcada'}: ${formatAppointmentDate(startsAt)}`)
      onSaved()
    } catch {
      setError('Não foi possível salvar. Tente novamente.')
      setSaving(false)
    }
  }

  return (
    <Page bottomSpace={14} sx={{ backgroundColor: colors.surface, gap: 2.5 }}>
      <PageHeader onBack={onBack} backLabel="Fechar" title={editing ? 'Remarcar consulta' : 'Nova consulta'} subtitle={patientName ? `com ${patientName}` : undefined} />

      {editing && appointment.rescheduleNote && (
        <Box sx={{ p: 1.75, borderRadius: '16px', backgroundColor: colors.alertBg }}>
          <Typography variant="body2"><b>{appointment.patientName}</b> pediu: “{appointment.rescheduleNote}”</Typography>
        </Box>
      )}

      {pickPatient && (
        <Box>
          <FieldLabel>Paciente</FieldLabel>
          {!patients && <Skeleton variant="rounded" height={40} sx={{ borderRadius: 999 }} />}
          {patients && patients.length === 0 && <Typography variant="body2" sx={{ color: colors.muted }}>Você ainda não tem pacientes vinculados.</Typography>}
          {patients && patients.length > 0 && (
            <ChoiceChips label="Paciente" options={patients.map((p) => ({ value: p.patientId, label: p.patientName }))} value={patientId} onChange={setPatientId} />
          )}
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 1.5 }}>
        <Box>
          <FieldLabel htmlFor="appt-date">Data</FieldLabel>
          <TextField id="appt-date" type="date" fullWidth value={date} onChange={(e) => setDate(e.target.value)} />
        </Box>
        <Box>
          <FieldLabel htmlFor="appt-time">Horário</FieldLabel>
          <TextField id="appt-time" type="time" fullWidth value={time} onChange={(e) => setTime(e.target.value)} />
        </Box>
      </Box>

      <Box>
        <FieldLabel>Duração</FieldLabel>
        <Segmented label="Duração" options={DURATIONS} value={durationMin} onChange={setDurationMin} />
      </Box>

      <Box>
        <FieldLabel>Tipo</FieldLabel>
        <Segmented label="Tipo de consulta" options={MODES} value={mode} onChange={setMode} />
      </Box>

      <Box>
        <FieldLabel htmlFor="appt-location" hint="(opcional)">{mode === 'telemedicina' ? 'Link da chamada' : 'Endereço'}</FieldLabel>
        <TextField id="appt-location" fullWidth placeholder={mode === 'telemedicina' ? 'https://meet…' : 'Rua, número, sala'} value={location} onChange={(e) => setLocation(e.target.value)} />
      </Box>

      <Box>
        <FieldLabel htmlFor="appt-notes" hint="(o paciente vê)">Orientações</FieldLabel>
        <TextField id="appt-notes" fullWidth multiline minRows={2} placeholder="Ex: trazer exames recentes, jejum de 8h" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Box>

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

      <ActionBar>
        <Button fullWidth size="large" variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Salvando…' : editing ? 'Salvar novo horário' : 'Marcar consulta'}
        </Button>
      </ActionBar>
    </Page>
  )
}
