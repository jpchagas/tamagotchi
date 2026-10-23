import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Skeleton from '@mui/material/Skeleton'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/AddRounded'
import SearchIcon from '@mui/icons-material/SearchRounded'
import ChevronRightIcon from '@mui/icons-material/ChevronRightRounded'
import GroupIcon from '@mui/icons-material/GroupOutlined'
import { Page, PageHeader, Segmented, GroupLabel, Section, RowButton, PersonAvatar, Pill, BottomSheet, EmptyState } from '../components/ui'
import { useToast } from '../components/toastContext'
import { colors, cardShadow } from '../theme'
import { getDoctorPatients, requestPatientDoctorLink, confirmPatientDoctorLink, declinePatientDoctorLink } from '../services/careTeamService'
import { listPatients } from '../services/userDirectoryService'
import { getUserProfile } from '../services/profileService'
import { getLatestRisksForPatients } from '../services/risksService'
import { calculateAge } from '../services/dateUtils'

const isIncoming = (p) => p.status === 'pending' && p.initiatedBy === 'patient'
const isOutgoing = (p) => p.status === 'pending' && p.initiatedBy === 'doctor'

const FILTERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'alertas', label: 'Precisam de atenção' },
]

function InvitePatientSheet({ open, onClose, doctorUid, doctorProfile, knownPatientIds, onInvited }) {
  const toast = useToast()
  const [patients, setPatients] = useState(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!open || patients) return
    listPatients().then(setPatients).catch(() => setPatients([]))
  }, [open, patients])

  const invite = async (patient) => {
    setBusy(patient.uid)
    try {
      await requestPatientDoctorLink({ patientUid: patient.uid, patientProfile: patient, doctorUid, doctorProfile, initiatedBy: 'doctor' })
      toast(`Convite enviado para ${patient.fullName}`)
      onInvited()
      setQuery('')
      onClose()
    } catch {
      toast('Não foi possível enviar o convite. Tente novamente.')
    } finally {
      setBusy(null)
    }
  }

  const q = query.trim().toLowerCase()
  const results = (patients || [])
    .filter((p) => !knownPatientIds.has(p.uid))
    .filter((p) => !q || p.fullName?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q))

  return (
    <BottomSheet open={open} onClose={onClose} title="Adicionar paciente" subtitle="O paciente confirma o convite no app.">
      <TextField
        fullWidth
        autoFocus
        placeholder="Buscar por nome ou e-mail"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        slotProps={{
          htmlInput: { 'aria-label': 'Buscar paciente' },
          input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: colors.muted }} /></InputAdornment> },
        }}
      />
      <Box sx={{ maxHeight: '45dvh', overflowY: 'auto', mx: -1, mt: 1.5 }}>
        {!patients && [0, 1, 2].map((i) => <Skeleton key={i} height={56} sx={{ mx: 1 }} />)}
        {patients && results.length === 0 && <Typography variant="body2" sx={{ color: colors.muted, px: 1, py: 2 }}>Nenhum paciente encontrado.</Typography>}
        {results.map((p) => (
          <RowButton key={p.uid} onClick={busy ? undefined : () => invite(p)}>
            <PersonAvatar name={p.fullName} size={40} />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>{p.fullName}</Typography>
              {p.email && <Typography variant="caption" sx={{ color: colors.muted }} noWrap component="div">{p.email}</Typography>}
            </Box>
            {busy === p.uid ? <CircularProgress size={20} /> : <Pill tone="brand">Convidar</Pill>}
          </RowButton>
        ))}
      </Box>
    </BottomSheet>
  )
}

export default function PatientsListPage({ doctorUid, doctorProfile, reviews, initialFilter = 'todos', onOpenPatient }) {
  const toast = useToast()
  const [patients, setPatients] = useState(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(initialFilter)
  const [inviting, setInviting] = useState(false)
  const [respondingTo, setRespondingTo] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!doctorUid) return
    let cancelled = false
    getDoctorPatients(doctorUid)
      .then(async (list) => {
        const confirmedIds = list.filter((p) => p.status === 'confirmed').map((p) => p.patientId)
        const [risks, profiles] = await Promise.all([
          getLatestRisksForPatients(confirmedIds),
          // One profile read per patient for the age — fine at this scale;
          // worth a denormalized field on careLinks if rosters grow large.
          Promise.all(confirmedIds.map((id) => getUserProfile(id).catch(() => null))),
        ])
        const highRisk = new Set(risks.filter((r) => r.category === 'alto').map((r) => r.patientId))
        const ages = Object.fromEntries(confirmedIds.map((id, i) => [id, calculateAge(profiles[i]?.dateOfBirth)]))
        if (!cancelled) setPatients(list.map((p) => ({ ...p, age: ages[p.patientId], highRisk: highRisk.has(p.patientId) })))
      })
      .catch(() => !cancelled && setError('Não foi possível carregar seus pacientes.'))
    return () => {
      cancelled = true
    }
  }, [doctorUid, reloadKey])

  const respond = async (link, accept) => {
    setRespondingTo(link.patientId)
    try {
      if (accept) await confirmPatientDoctorLink(link.patientId, doctorUid)
      else await declinePatientDoctorLink(link.patientId, doctorUid)
      toast(accept ? `${link.patientName} agora é seu paciente` : 'Pedido recusado')
      setReloadKey((k) => k + 1)
    } catch {
      toast('Não foi possível responder. Tente novamente.')
    } finally {
      setRespondingTo(null)
    }
  }

  const pendingReview = new Set((reviews || []).filter((r) => r.reviewStatus === 'not_reviewed').map((r) => r.patientId))
  const all = (patients || []).map((p) => ({ ...p, pendingReview: pendingReview.has(p.patientId) }))
  const incoming = all.filter(isIncoming)
  const outgoing = all.filter(isOutgoing)
  const q = search.trim().toLowerCase()
  const visible = all
    .filter((p) => p.status === 'confirmed')
    .filter((p) => filter !== 'alertas' || p.pendingReview || p.highRisk)
    .filter((p) => !q || p.patientName?.toLowerCase().includes(q))

  return (
    <Page>
      <PageHeader
        title="Pacientes"
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setInviting(true)} sx={{ borderRadius: 999 }}>Adicionar</Button>}
      />

      <TextField
        fullWidth
        placeholder="Buscar paciente"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        slotProps={{
          htmlInput: { 'aria-label': 'Buscar paciente' },
          input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: colors.muted }} /></InputAdornment> },
        }}
      />
      <Segmented label="Filtro" options={FILTERS} value={filter} onChange={setFilter} />

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}
      {!patients && !error && [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: '18px' }} />)}

      {incoming.map((link) => (
        <Box key={link.id} sx={{ backgroundColor: colors.surface, borderRadius: '22px', p: 2, border: `2px solid ${colors.brandTint}`, boxShadow: cardShadow, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PersonAvatar name={link.patientName} />
            <Box>
              <Typography variant="subtitle1">{link.patientName}</Typography>
              <Typography variant="body2" sx={{ color: colors.muted }}>Quer você na equipe de cuidado</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
            <Button variant="outlined" disabled={respondingTo === link.patientId} onClick={() => respond(link, false)}>Recusar</Button>
            <Button variant="contained" disabled={respondingTo === link.patientId} onClick={() => respond(link, true)}>Aceitar</Button>
          </Box>
        </Box>
      ))}

      {patients && visible.length === 0 && incoming.length === 0 && (
        <EmptyState icon={<GroupIcon />} title={q || filter !== 'todos' ? 'Ninguém por aqui' : 'Nenhum paciente ainda'}>
          {q || filter !== 'todos' ? 'Nenhum paciente corresponde ao filtro.' : 'Convide seus pacientes pelo botão Adicionar.'}
        </EmptyState>
      )}

      {visible.length > 0 && (
        <Section padded={false}>
          {visible.map((p) => {
            const attention = p.pendingReview || p.highRisk
            return (
              <RowButton key={p.id} onClick={() => onOpenPatient({ patientId: p.patientId, patientName: p.patientName })}>
                <Box sx={{ position: 'relative' }}>
                  <PersonAvatar name={p.patientName} />
                  <Box sx={{ position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: '50%', border: `2px solid ${colors.surface}`, backgroundColor: attention ? colors.alert : colors.good }} />
                </Box>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{p.patientName}</Typography>
                  <Typography variant="body2" sx={{ color: colors.muted }} noWrap>
                    {[p.age ? `${p.age} anos` : null, p.pendingReview ? 'Exame para revisar' : p.highRisk ? 'Risco alto' : 'Em acompanhamento'].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: colors.muted }} />
              </RowButton>
            )
          })}
        </Section>
      )}

      {outgoing.length > 0 && (
        <>
          <GroupLabel>Convites enviados</GroupLabel>
          <Section padded={false}>
            {outgoing.map((p) => (
              <RowButton key={p.id}>
                <PersonAvatar name={p.patientName} sx={{ backgroundColor: colors.ground, color: colors.muted, border: `2px dashed ${colors.lineStrong}` }} />
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }} noWrap>{p.patientName}</Typography>
                <Pill>Aguardando</Pill>
              </RowButton>
            ))}
          </Section>
        </>
      )}

      <InvitePatientSheet
        open={inviting}
        onClose={() => setInviting(false)}
        doctorUid={doctorUid}
        doctorProfile={doctorProfile}
        knownPatientIds={new Set(all.map((p) => p.patientId))}
        onInvited={() => setReloadKey((k) => k + 1)}
      />
    </Page>
  )
}
