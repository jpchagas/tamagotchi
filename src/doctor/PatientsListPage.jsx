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
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import SendPrescriptionPage from './SendPrescriptionPage'
import {
  getDoctorPatients,
  requestPatientDoctorLink,
  confirmPatientDoctorLink,
  declinePatientDoctorLink,
} from '../services/careTeamService'
import { listPatients } from '../services/userDirectoryService'

const isConfirmed = (p) => p.status !== 'pending'
const isIncomingRequest = (p) => p.status === 'pending' && p.initiatedBy === 'patient'
const isOutgoingRequest = (p) => p.status === 'pending' && p.initiatedBy === 'doctor'

export default function PatientsListPage({ doctorUid, doctorProfile, onBack }) {
  const [patients, setPatients] = useState(null)
  const [error, setError] = useState('')

  const [patientOptions, setPatientOptions] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [linking, setLinking] = useState(false)
  const [respondingTo, setRespondingTo] = useState(null)
  const [sendingPrescriptionTo, setSendingPrescriptionTo] = useState(null)

  const loadPatients = () => {
    if (!doctorUid) return
    getDoctorPatients(doctorUid)
      .then(setPatients)
      .catch(() => setError('Não foi possível carregar seus pacientes.'))
  }

  useEffect(() => {
    if (!doctorUid) {
      setError('Usuário não identificado.')
      return
    }
    loadPatients()
  }, [doctorUid])

  useEffect(() => {
    listPatients()
      .then(setPatientOptions)
      .catch(() => {})
  }, [])

  const handleAddPatient = async () => {
    if (!selectedPatient || !doctorUid || !doctorProfile) return
    setLinking(true)
    try {
      await requestPatientDoctorLink({
        patientUid: selectedPatient.uid,
        patientProfile: selectedPatient,
        doctorUid,
        doctorProfile,
        initiatedBy: 'doctor',
      })
      setSelectedPatient(null)
      loadPatients()
    } catch {
      setError('Não foi possível enviar o convite. Tente novamente.')
    } finally {
      setLinking(false)
    }
  }

  const handleRespond = async (patientUid, accept) => {
    setRespondingTo(patientUid)
    try {
      if (accept) await confirmPatientDoctorLink(patientUid, doctorUid)
      else await declinePatientDoctorLink(patientUid, doctorUid)
      loadPatients()
    } catch {
      setError('Não foi possível processar sua resposta. Tente novamente.')
    } finally {
      setRespondingTo(null)
    }
  }

  const all = patients || []
  const incomingRequests = all.filter(isIncomingRequest)
  const confirmedPatients = all.filter(isConfirmed)
  const outgoingRequests = all.filter(isOutgoingRequest)

  const alreadyKnownUids = new Set(all.map((p) => p.patientUid))
  const availablePatients = patientOptions.filter((p) => !alreadyKnownUids.has(p.uid))

  if (sendingPrescriptionTo) {
    return (
      <SendPrescriptionPage
        doctorUid={doctorUid}
        doctorProfile={doctorProfile}
        patient={sendingPrescriptionTo}
        onBack={() => setSendingPrescriptionTo(null)}
      />
    )
  }

  return (
    <Box sx={{ p: 2, pb: 6, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={onBack} sx={{ mr: 0.5 }}>
          <ArrowBackIcon sx={{ color: '#2b2338' }} />
        </IconButton>
        <Box>
          <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>Meus pacientes</Typography>
          <Typography variant="body2" sx={{ color: '#7a7186' }}>
            Pacientes em acompanhamento.
          </Typography>
        </Box>
      </Box>

      {/* Incoming requests: a patient added this doctor and is waiting for confirmation */}
      {incomingRequests.length > 0 && (
        <Card sx={{ borderRadius: 4, p: 2, mb: 2, backgroundColor: '#ece5f5' }}>
          <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1 }}>
            Solicitações pendentes
          </Typography>
          {incomingRequests.map((req) => (
            <Box key={req.patientUid} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1 }}>
              <Box>
                <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{req.name}</Typography>
                <Typography variant="body2" sx={{ color: '#7a7186' }}>
                  quer adicionar você à equipe de cuidado
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {respondingTo === req.patientUid ? (
                  <CircularProgress size={20} sx={{ color: '#634879' }} />
                ) : (
                  <>
                    <Button size="small" onClick={() => handleRespond(req.patientUid, false)} sx={{ color: '#7a7186', textTransform: 'none' }}>
                      Recusar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => handleRespond(req.patientUid, true)}
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

      {/* Add patient */}
      <Card sx={{ borderRadius: 4, p: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1 }}>
          Adicionar paciente
        </Typography>
        <Autocomplete
          fullWidth
          size="small"
          options={availablePatients}
          value={selectedPatient}
          onChange={(_, value) => setSelectedPatient(value)}
          getOptionLabel={(p) => p.fullName || ''}
          isOptionEqualToValue={(a, b) => a.uid === b.uid}
          renderOption={(props, option) => (
            <li {...props} key={option.uid}>
              <Box>
                <Typography sx={{ fontSize: '0.9rem' }}>{option.fullName}</Typography>
                {option.email && (
                  <Typography variant="caption" sx={{ color: '#7a7186' }}>{option.email}</Typography>
                )}
              </Box>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} placeholder="Buscar paciente pelo nome..." sx={fieldSx} />
          )}
          noOptionsText="Nenhum paciente encontrado"
        />
        {selectedPatient && (
          <Button
            fullWidth
            variant="contained"
            disabled={linking}
            onClick={handleAddPatient}
            sx={{
              mt: 1.5, backgroundColor: '#634879', borderRadius: 3, py: 1, fontWeight: 600,
              textTransform: 'none', '&:hover': { backgroundColor: '#4f3a63' },
            }}
          >
            {linking ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : `Enviar convite para ${selectedPatient.fullName}`}
          </Button>
        )}
      </Card>

      {error && (
        <Typography variant="body2" sx={{ color: '#d64545', mb: 2 }}>
          {error}
        </Typography>
      )}

      {!patients && !error && (
        <>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ height: 64, borderRadius: 4, mb: 1.2 }} />
          ))}
        </>
      )}

      {patients && confirmedPatients.length === 0 && incomingRequests.length === 0 && !error && (
        <Typography variant="body2" sx={{ color: '#7a7186' }}>
          Nenhum paciente adicionado ainda.
        </Typography>
      )}

      {confirmedPatients.map((p) => (
        <Card
          key={p.id}
          sx={{ borderRadius: 4, p: 1.6, mb: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ width: 44, height: 44 }}>👤</Avatar>
            <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{p.name}</Typography>
          </Box>
          <IconButton onClick={() => setSendingPrescriptionTo(p)} aria-label="Enviar receita" sx={{ color: '#634879' }}>
            <DescriptionOutlinedIcon />
          </IconButton>
        </Card>
      ))}

      {outgoingRequests.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700 }}>
            CONVITES ENVIADOS
          </Typography>
          {outgoingRequests.map((req) => (
            <Card key={req.patientUid} sx={{ borderRadius: 4, p: 1.6, mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ width: 44, height: 44 }}>👤</Avatar>
                <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{req.name}</Typography>
              </Box>
              <Chip label="Aguardando confirmação" size="small" sx={{ backgroundColor: '#f0eef3', color: '#7a7186', fontWeight: 600 }} />
            </Card>
          ))}
        </Box>
      )}
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' },
}
