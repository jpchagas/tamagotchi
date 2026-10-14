import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Skeleton from '@mui/material/Skeleton'
import CircularProgress from '@mui/material/CircularProgress'
import AddIcon from '@mui/icons-material/AddRounded'
import PhoneIcon from '@mui/icons-material/PhoneOutlined'
import SearchIcon from '@mui/icons-material/SearchRounded'
import GroupIcon from '@mui/icons-material/GroupOutlined'
import { Page, PageHeader, GroupLabel, Section, RowButton, PersonAvatar, Pill, BottomSheet, Segmented, FieldLabel, ChoiceChips, EmptyState } from '../components/ui'
import { useToast } from '../components/toastContext'
import { colors, cardShadow } from '../theme'
import {
  getPatientCareLinks,
  getCareContacts,
  addCareContact,
  requestPatientDoctorLink,
  confirmPatientDoctorLink,
  declinePatientDoctorLink,
} from '../services/careTeamService'
import { listDoctors } from '../services/userDirectoryService'

const isIncoming = (link) => link.status === 'pending' && link.initiatedBy === 'doctor'
const isOutgoing = (link) => link.status === 'pending' && link.initiatedBy === 'patient'

const CONTACT_TYPES = [
  { value: 'family', label: 'Familiar' },
  { value: 'nurse', label: 'Enfermagem / cuidador' },
]

function CallButton({ name, phone }) {
  if (!phone) return null
  return (
    <IconButton component="a" href={`tel:${phone.replace(/[^\d+]/g, '')}`} aria-label={`Ligar para ${name}`} sx={{ width: 44, height: 44, backgroundColor: colors.brandTint, color: colors.brand }}>
      <PhoneIcon fontSize="small" />
    </IconButton>
  )
}

function AddMemberSheet({ open, onClose, uid, profile, knownDoctorIds, onAdded }) {
  const toast = useToast()
  const [mode, setMode] = useState('doctor')
  const [doctors, setDoctors] = useState(null)
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(null)
  const [contact, setContact] = useState({ name: '', memberType: 'family', relationship: '', phone: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || doctors) return
    listDoctors().then(setDoctors).catch(() => setDoctors([]))
  }, [open, doctors])

  const close = () => {
    setQuery('')
    setError('')
    setContact({ name: '', memberType: 'family', relationship: '', phone: '' })
    onClose()
  }

  const invite = async (doctor) => {
    setBusy(doctor.uid)
    try {
      await requestPatientDoctorLink({ patientUid: uid, patientProfile: profile, doctorUid: doctor.uid, doctorProfile: doctor, initiatedBy: 'patient' })
      toast(`Convite enviado para ${doctor.fullName}`)
      onAdded()
      close()
    } catch {
      setError('Não foi possível enviar o convite. Tente novamente.')
    } finally {
      setBusy(null)
    }
  }

  const saveContact = async () => {
    if (!contact.name.trim()) {
      setError('Informe o nome.')
      return
    }
    setBusy('contact')
    try {
      const fields = { name: contact.name.trim(), memberType: contact.memberType, phone: contact.phone.trim() }
      if (contact.memberType === 'family') fields.relationship = contact.relationship.trim()
      else fields.specialty = contact.relationship.trim()
      await addCareContact(uid, fields)
      toast(`${fields.name} adicionado(a) à sua equipe`)
      onAdded()
      close()
    } catch {
      setError('Não foi possível salvar. Tente novamente.')
    } finally {
      setBusy(null)
    }
  }

  const q = query.trim().toLowerCase()
  const results = (doctors || [])
    .filter((d) => !knownDoctorIds.has(d.uid))
    .filter((d) => !q || d.fullName?.toLowerCase().includes(q) || d.specialty?.toLowerCase().includes(q))

  return (
    <BottomSheet open={open} onClose={close} title="Adicionar à equipe">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Segmented label="Tipo" options={[{ value: 'doctor', label: 'Médico(a)' }, { value: 'contact', label: 'Familiar ou cuidador' }]} value={mode} onChange={(v) => { setMode(v); setError('') }} />

        {mode === 'doctor' ? (
          <>
            <TextField
              fullWidth
              autoFocus
              placeholder="Buscar por nome ou especialidade"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              slotProps={{
                htmlInput: { 'aria-label': 'Buscar médico' },
                input: { startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: colors.muted }} /></InputAdornment> },
              }}
            />
            <Box sx={{ maxHeight: '40dvh', overflowY: 'auto', mx: -1 }}>
              {!doctors && [0, 1, 2].map((i) => <Skeleton key={i} height={56} sx={{ mx: 1 }} />)}
              {doctors && results.length === 0 && (
                <Typography variant="body2" sx={{ color: colors.muted, px: 1, py: 2 }}>Nenhum médico encontrado.</Typography>
              )}
              {results.map((d) => (
                <RowButton key={d.uid} onClick={busy ? undefined : () => invite(d)}>
                  <PersonAvatar name={d.fullName} size={40} />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap>{d.fullName}</Typography>
                    <Typography variant="caption" sx={{ color: colors.muted }}>{d.specialty || 'Médico(a)'}</Typography>
                  </Box>
                  {busy === d.uid ? <CircularProgress size={20} /> : <Pill tone="brand">Convidar</Pill>}
                </RowButton>
              ))}
            </Box>
          </>
        ) : (
          <>
            <ChoiceChips label="Relação" options={CONTACT_TYPES} value={contact.memberType} onChange={(v) => setContact((c) => ({ ...c, memberType: v }))} />
            <Box>
              <FieldLabel htmlFor="contact-name">Nome</FieldLabel>
              <TextField id="contact-name" fullWidth value={contact.name} onChange={(e) => { const { value } = e.target; setContact((c) => ({ ...c, name: value })) }} />
            </Box>
            <Box>
              <FieldLabel htmlFor="contact-rel" hint="(opcional)">{contact.memberType === 'family' ? 'Parentesco' : 'Função'}</FieldLabel>
              <TextField id="contact-rel" fullWidth placeholder={contact.memberType === 'family' ? 'Filha, cônjuge…' : 'Enfermagem domiciliar…'} value={contact.relationship} onChange={(e) => { const { value } = e.target; setContact((c) => ({ ...c, relationship: value })) }} />
            </Box>
            <Box>
              <FieldLabel htmlFor="contact-phone" hint="(opcional)">Telefone</FieldLabel>
              <TextField id="contact-phone" fullWidth type="tel" value={contact.phone} onChange={(e) => { const { value } = e.target; setContact((c) => ({ ...c, phone: value })) }} />
            </Box>
            <Button size="large" variant="contained" onClick={saveContact} disabled={busy === 'contact'}>
              {busy === 'contact' ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Adicionar'}
            </Button>
          </>
        )}
        {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}
      </Box>
    </BottomSheet>
  )
}

export default function TeamPage({ uid, profile }) {
  const toast = useToast()
  const [team, setTeam] = useState(null) // { links, contacts }
  const [error, setError] = useState('')
  const [adding, setAdding] = useState(false)
  const [respondingTo, setRespondingTo] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    Promise.all([getPatientCareLinks(uid), getCareContacts(uid)])
      .then(([links, contacts]) => !cancelled && setTeam({ links, contacts }))
      .catch(() => !cancelled && setError('Não foi possível carregar sua equipe.'))
    return () => {
      cancelled = true
    }
  }, [uid, reloadKey])

  const reload = () => setReloadKey((k) => k + 1)

  const respond = async (link, accept) => {
    setRespondingTo(link.doctorId)
    try {
      if (accept) await confirmPatientDoctorLink(uid, link.doctorId)
      else await declinePatientDoctorLink(uid, link.doctorId)
      toast(accept ? `${link.doctorName} agora faz parte da sua equipe` : 'Pedido recusado')
      reload()
    } catch {
      toast('Não foi possível responder. Tente novamente.')
    } finally {
      setRespondingTo(null)
    }
  }

  const links = team?.links || []
  const incoming = links.filter(isIncoming)
  const doctors = links.filter((l) => l.status === 'confirmed')
  const outgoing = links.filter(isOutgoing)
  const contacts = team?.contacts || []

  return (
    <Page>
      <PageHeader
        title="Sua equipe"
        subtitle="Quem cuida da sua saúde com você."
        actions={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setAdding(true)} sx={{ borderRadius: 999 }}>Adicionar</Button>}
      />

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}
      {!team && !error && [0, 1].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: '22px' }} />)}

      {incoming.map((link) => (
        <Box key={link.id} sx={{ backgroundColor: colors.surface, borderRadius: '22px', p: 2, border: `2px solid ${colors.brandTint}`, boxShadow: cardShadow, display: 'flex', flexDirection: 'column', gap: 1.75 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PersonAvatar name={link.doctorName} size={48} />
            <Box>
              <Typography variant="subtitle1">{link.doctorName}</Typography>
              <Typography variant="body2" sx={{ color: colors.muted }}>{[link.doctorSpecialty, link.doctorCrm].filter(Boolean).join(' · ')}</Typography>
            </Box>
          </Box>
          <Typography variant="body2">Quer fazer parte da sua equipe. Poderá ver seus exames e indicadores.</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
            <Button variant="outlined" disabled={respondingTo === link.doctorId} onClick={() => respond(link, false)}>Recusar</Button>
            <Button variant="contained" disabled={respondingTo === link.doctorId} onClick={() => respond(link, true)}>Aceitar</Button>
          </Box>
        </Box>
      ))}

      {team && doctors.length + outgoing.length + contacts.length + incoming.length === 0 && (
        <EmptyState icon={<GroupIcon />} title="Monte sua equipe" action={<Button variant="contained" onClick={() => setAdding(true)}>Adicionar médico</Button>}>
          Adicione seus médicos para enviar exames e receber seu plano.
        </EmptyState>
      )}

      {(doctors.length > 0 || outgoing.length > 0) && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <GroupLabel>Médicos</GroupLabel>
          <Section padded={false}>
            {doctors.map((d) => (
              <RowButton key={d.id}>
                <PersonAvatar name={d.doctorName} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{d.doctorName}</Typography>
                  <Typography variant="body2" sx={{ color: colors.muted }} noWrap>{[d.doctorSpecialty, d.doctorCrm].filter(Boolean).join(' · ')}</Typography>
                </Box>
              </RowButton>
            ))}
            {outgoing.map((d) => (
              <RowButton key={d.id}>
                <PersonAvatar name={d.doctorName} sx={{ backgroundColor: colors.ground, color: colors.muted, border: `2px dashed ${colors.lineStrong}` }} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{d.doctorName}</Typography>
                  <Typography variant="body2" sx={{ color: colors.muted }}>Convite enviado</Typography>
                </Box>
                <Pill>Aguardando</Pill>
              </RowButton>
            ))}
          </Section>
        </Box>
      )}

      {contacts.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <GroupLabel>Outros cuidadores</GroupLabel>
          <Section padded={false}>
            {contacts.map((c) => (
              <RowButton key={c.id}>
                <PersonAvatar name={c.name} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" noWrap>{c.name}</Typography>
                  <Typography variant="body2" sx={{ color: colors.muted }}>{c.memberType === 'nurse' ? c.specialty || 'Enfermagem' : c.relationship || 'Família'}</Typography>
                </Box>
                <CallButton name={c.name} phone={c.phone} />
              </RowButton>
            ))}
          </Section>
        </Box>
      )}

      <AddMemberSheet
        open={adding}
        onClose={() => setAdding(false)}
        uid={uid}
        profile={profile}
        knownDoctorIds={new Set(links.map((l) => l.doctorId))}
        onAdded={reload}
      />
    </Page>
  )
}
