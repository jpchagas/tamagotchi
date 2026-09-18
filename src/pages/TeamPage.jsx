import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Autocomplete from '@mui/material/Autocomplete'
import TextField from '@mui/material/TextField'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChatBubbleOutlinedIcon from "@mui/icons-material/ChatBubbleOutlined"
import {
  getCareTeam,
  groupByMemberType,
  requestPatientDoctorLink,
  confirmPatientDoctorLink,
  declinePatientDoctorLink,
} from '../services/careTeamService'
import { listDoctors } from '../services/userDirectoryService'

const SECTION_LABELS = {
  doctor: 'Médicos',
  nurse: 'Enfermagem',
  family: 'Família',
}

function subtitleFor(member) {
  if (member.memberType === 'doctor') return `${member.specialty || ''} · ${member.crm || ''}`.trim()
  if (member.memberType === 'nurse') return member.specialty || 'Enfermagem'
  if (member.memberType === 'family') return member.relationship || 'Família'
  return ''
}

// Manually-added members (family, nurse, or doctors seeded before this
// feature existed) have no status field — treat that as already confirmed.
const isConfirmed = (m) => m.status !== 'pending'
const isIncomingRequest = (m) => m.status === 'pending' && m.initiatedBy === 'doctor'
const isOutgoingRequest = (m) => m.status === 'pending' && m.initiatedBy === 'patient'

export default function TeamPage({ uid, profile, onBack }) {
  const [grouped, setGrouped] = useState(null)
  const [error, setError] = useState('')

  const [doctorOptions, setDoctorOptions] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [linking, setLinking] = useState(false)
  const [respondingTo, setRespondingTo] = useState(null)

  const loadCareTeam = () => {
    if (!uid) return
    getCareTeam(uid)
      .then((members) => setGrouped(groupByMemberType(members)))
      .catch(() => setError('Não foi possível carregar sua equipe.'))
  }

  useEffect(() => {
    if (!uid) {
      setError('Usuário não identificado.')
      return
    }
    loadCareTeam()
  }, [uid])

  useEffect(() => {
    listDoctors()
      .then(setDoctorOptions)
      .catch(() => {})
  }, [])

  const handleAddDoctor = async () => {
    if (!selectedDoctor || !uid || !profile) return
    setLinking(true)
    try {
      await requestPatientDoctorLink({
        patientUid: uid,
        patientProfile: profile,
        doctorUid: selectedDoctor.uid,
        doctorProfile: selectedDoctor,
        initiatedBy: 'patient',
      })
      setSelectedDoctor(null)
      loadCareTeam()
    } catch {
      setError('Não foi possível enviar o convite. Tente novamente.')
    } finally {
      setLinking(false)
    }
  }

  const handleRespond = async (doctorUid, accept) => {
    setRespondingTo(doctorUid)
    try {
      if (accept) await confirmPatientDoctorLink(uid, doctorUid)
      else await declinePatientDoctorLink(uid, doctorUid)
      loadCareTeam()
    } catch {
      setError('Não foi possível processar sua resposta. Tente novamente.')
    } finally {
      setRespondingTo(null)
    }
  }

  const doctors = grouped?.doctor || []
  const incomingRequests = doctors.filter(isIncomingRequest)
  const confirmedByType = grouped
    ? {
        doctor: doctors.filter(isConfirmed),
        nurse: (grouped.nurse || []).filter(isConfirmed),
        family: (grouped.family || []).filter(isConfirmed),
      }
    : null
  const sections = confirmedByType
    ? ['doctor', 'nurse', 'family'].filter((type) => confirmedByType[type].length > 0)
    : []

  const alreadyKnownUids = new Set(doctors.map((d) => d.doctorUid).filter(Boolean))
  const availableDoctors = doctorOptions.filter((d) => !alreadyKnownUids.has(d.uid))

  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {onBack && (
          <IconButton onClick={onBack} sx={{ mr: 0.5 }}>
            <ArrowBackIcon sx={{ color: '#2b2338' }} />
          </IconButton>
        )}
        <Box>
          <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>Equipe médica</Typography>
          <Typography variant="body2" sx={{ color: '#7a7186' }}>
            Sua equipe de cuidado.
          </Typography>
        </Box>
      </Box>

      {/* Incoming requests: a doctor added this patient and is waiting for confirmation */}
      {incomingRequests.length > 0 && (
        <Card sx={{ borderRadius: 4, p: 2, mb: 2, backgroundColor: '#ece5f5' }}>
          <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1 }}>
            Solicitações pendentes
          </Typography>
          {incomingRequests.map((req) => (
            <Box key={req.doctorUid} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{req.name}</Typography>
                <Typography variant="body2" sx={{ color: '#7a7186' }}>
                  quer entrar na sua equipe de cuidado
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {respondingTo === req.doctorUid ? (
                  <CircularProgress size={20} sx={{ color: '#634879' }} />
                ) : (
                  <>
                    <Button size="small" onClick={() => handleRespond(req.doctorUid, false)} sx={{ color: '#7a7186', textTransform: 'none' }}>
                      Recusar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleRespond(req.doctorUid, true)}
                      sx={{ backgroundColor: '#634879', textTransform: 'none', '&:hover': { backgroundColor: '#4f3a63' } }}
                    >
                      Aceitar
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          ))}
        </Card>
      )}

      {/* Add doctor */}
      <Card sx={{ borderRadius: 4, p: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1 }}>
          Adicionar médico
        </Typography>
        <Autocomplete
          fullWidth
          size="small"
          options={availableDoctors}
          value={selectedDoctor}
          onChange={(_, value) => setSelectedDoctor(value)}
          getOptionLabel={(d) => d.fullName || ''}
          isOptionEqualToValue={(a, b) => a.uid === b.uid}
          renderOption={(props, option) => (
            <li {...props} key={option.uid}>
              <Box>
                <Typography sx={{ fontSize: '0.9rem' }}>{option.fullName}</Typography>
                <Typography variant="caption" sx={{ color: '#7a7186' }}>
                  {option.specialty || 'Médico(a)'}
                </Typography>
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} placeholder="Buscar médico pelo nome..." sx={fieldSx} />
          )}
          noOptionsText="Nenhum médico encontrado"
        />
        {selectedDoctor && (
          <Button
            fullWidth
            variant="contained"
            disabled={linking}
            onClick={handleAddDoctor}
            sx={{
              mt: 1.5, backgroundColor: '#634879', borderRadius: 3, py: 1, fontWeight: 600,
              textTransform: 'none', '&:hover': { backgroundColor: '#4f3a63' },
            }}
          >
            {linking ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : `Enviar convite para ${selectedDoctor.fullName}`}
          </Button>
        )}
      </Card>

      {error && (
        <Typography variant="body2" sx={{ color: '#d64545', mb: 2 }}>
          {error}
        </Typography>
      )}

      {!grouped && !error && (
        <>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ height: 72, borderRadius: 4, mb: 1.2 }} />
          ))}
        </>
      )}

      {grouped && sections.length === 0 && incomingRequests.length === 0 && !error && (
        <Typography variant="body2" sx={{ color: '#7a7186', mb: 2 }}>
          Nenhum profissional ou familiar adicionado ainda.
        </Typography>
      )}

      {confirmedByType &&
        sections.map((type) => (
          <Box key={type} sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700 }}>
              {SECTION_LABELS[type].toUpperCase()}
            </Typography>
            {confirmedByType[type].map((member) => (
              <Card
                key={member.id}
                sx={{ borderRadius: 4, p: 1.6, mt: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <Avatar sx={{ width: 48, height: 48 }}>👤</Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{member.name}</Typography>
                  <Typography variant="body2" sx={{ color: '#7a7186' }}>{subtitleFor(member)}</Typography>
                  {member.phone && (
                    <Typography variant="caption" sx={{ color: '#b3aebb' }}>{member.phone}</Typography>
                  )}
                </Box>
              </Card>
            ))}
          </Box>
        ))}

      {/* Outgoing requests: this patient invited a doctor, awaiting their confirmation */}
      {doctors.filter(isOutgoingRequest).length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700 }}>
            CONVITES ENVIADOS
          </Typography>
          {doctors.filter(isOutgoingRequest).map((req) => (
            <Card key={req.doctorUid} sx={{ borderRadius: 4, p: 1.6, mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 48, height: 48 }}>👤</Avatar>
                <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{req.name}</Typography>
              </Box>
              <Chip label="Aguardando confirmação" size="small" sx={{ backgroundColor: '#f0eef3', color: '#7a7186', fontWeight: 600 }} />
            </Card>
          ))}
        </Box>
      )}

      <Card sx={{ borderRadius: 4, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <ChatBubbleOutlinedIcon sx={{ color: '#634879' }} />
          <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>
            Precisa falar com sua equipe?
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#7a7186', mb: 1.5 }}>
          Agende uma consulta ou tire suas dúvidas pelo chat.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          sx={{ backgroundColor: '#634879', borderRadius: 3, py: 1.2, fontWeight: 600, '&:hover': { backgroundColor: '#4f3a63' } }}
        >
          Falar com a equipe
        </Button>
      </Card>
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' },
}
