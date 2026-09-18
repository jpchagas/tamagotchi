import { useState, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { uploadPrescriptionFile } from '../services/storageService'
import { addConduct } from '../services/conductsService'
import { addExam } from '../services/examsService'

const CONDUCT_TIMEFRAMES = [
  { key: 'agora', label: 'Agora' },
  { key: 'proximos90', label: 'Próximos 90 dias' },
  { key: 'esteAno', label: 'Este ano' },
  { key: 'longoPrazo', label: 'Longo prazo' },
]
const CONDUCT_TYPES = [
  { key: 'medication', label: 'Medicação' },
  { key: 'diet', label: 'Dieta' },
  { key: 'exercise', label: 'Exercício' },
  { key: 'followup', label: 'Acompanhamento' },
]
const EXAM_PRIORITIES = [
  { key: 'prioritario', label: 'Prioritário' },
  { key: 'rotina', label: 'Rotina' },
]

function daysFromNow(days) {
  const d = new Date()
  d.setDate(d.getDate() + Number(days))
  return d
}

export default function SendPrescriptionPage({ doctorUid, doctorProfile, patient, onBack }) {
  const fileInputRef = useRef(null)
  const [kind, setKind] = useState('conduct') // 'conduct' | 'exam'
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [why, setWhy] = useState('')
  const [timeframe, setTimeframe] = useState('agora')
  const [conductType, setConductType] = useState('medication')
  const [priority, setPriority] = useState('prioritario')
  const [daysUntil, setDaysUntil] = useState('7')

  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle -> uploading -> saving -> done -> error
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleSubmit = async () => {
    if (!title || !file) {
      setError('Preencha o título e anexe o PDF da receita.')
      return
    }

    setError('')
    setStatus('uploading')
    try {
      const tempId = `${Date.now()}`
      const { fileUrl } = await uploadPrescriptionFile(patient.patientUid, tempId, file, setUploadProgress)

      setStatus('saving')
      const commonFields = {
        title,
        doctorUid,
        doctorName: doctorProfile?.fullName || '',
        attachmentUrl: fileUrl,
        attachmentFileName: file.name,
      }

      if (kind === 'conduct') {
        await addConduct(patient.patientUid, {
          ...commonFields,
          why,
          timeframe,
          type: conductType,
          dueDate: daysFromNow(daysUntil),
        })
      } else {
        await addExam(patient.patientUid, {
          ...commonFields,
          status: 'solicitado',
          priority,
          icon: 'lab',
          scheduledDate: daysFromNow(daysUntil),
        })
      }

      setStatus('done')
    } catch (err) {
      setError('Não foi possível enviar a receita. Tente novamente.')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: '#f7f5fa', p: 3 }}>
        <IconButton onClick={onBack} sx={{ mb: 1, ml: -1 }}>
          <ArrowBackIcon sx={{ color: '#2b2338' }} />
        </IconButton>
        <Card sx={{ borderRadius: 4, p: 3, backgroundColor: '#e6f5ea', textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 40, color: '#3ba55c', mb: 1 }} />
          <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 0.5 }}>
            Receita enviada!
          </Typography>
          <Typography variant="body2" sx={{ color: '#4a6b52', mb: 2 }}>
            {patient.name} vai ver isso {kind === 'conduct' ? 'no Plano' : 'na Agenda'}.
          </Typography>
          <Button
            fullWidth
            variant="contained"
            onClick={onBack}
            sx={{ backgroundColor: '#634879', borderRadius: 3, py: 1.2, fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#4f3a63' } }}
          >
            Voltar
          </Button>
        </Card>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f7f5fa', p: 3, pb: 6 }}>
      <IconButton onClick={onBack} sx={{ mb: 1, ml: -1 }}>
        <ArrowBackIcon sx={{ color: '#2b2338' }} />
      </IconButton>

      <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', color: '#2b2338', mb: 0.3 }}>
        Enviar receita
      </Typography>
      <Typography variant="body2" sx={{ color: '#7a7186', mb: 3 }}>
        Para {patient.name}
      </Typography>

      <Typography sx={{ fontWeight: 600, color: '#2b2338', mb: 1 }}>
        Esta receita é sobre:
      </Typography>
      <ToggleButtonGroup
        fullWidth
        exclusive
        value={kind}
        onChange={(_, value) => value && setKind(value)}
        sx={{ mb: 3 }}
      >
        <ToggleButton value="conduct" sx={toggleSx}>Medicação / Hábito</ToggleButton>
        <ToggleButton value="exam" sx={toggleSx}>Exame a realizar</ToggleButton>
      </ToggleButtonGroup>

      <TextField
        fullWidth
        label="Título"
        placeholder={kind === 'conduct' ? 'Ex: Tomar losartana diariamente' : 'Ex: Hemograma completo'}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        margin="normal"
        sx={fieldSx}
      />

      {kind === 'conduct' ? (
        <>
          <TextField
            fullWidth
            label="Por quê? (motivo/orientação)"
            placeholder="Ex: Evitar carnes gordurosas e reduzir sódio"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            margin="normal"
            multiline
            minRows={2}
            sx={fieldSx}
          />
          <TextField select fullWidth label="Prazo" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} margin="normal" sx={fieldSx}>
            {CONDUCT_TIMEFRAMES.map((t) => (
              <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
            ))}
          </TextField>
          <TextField select fullWidth label="Tipo" value={conductType} onChange={(e) => setConductType(e.target.value)} margin="normal" sx={fieldSx}>
            {CONDUCT_TYPES.map((t) => (
              <MenuItem key={t.key} value={t.key}>{t.label}</MenuItem>
            ))}
          </TextField>
        </>
      ) : (
        <TextField select fullWidth label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value)} margin="normal" sx={fieldSx}>
          {EXAM_PRIORITIES.map((p) => (
            <MenuItem key={p.key} value={p.key}>{p.label}</MenuItem>
          ))}
        </TextField>
      )}

      <TextField
        fullWidth
        type="number"
        label={kind === 'conduct' ? 'Prazo (dias a partir de hoje)' : 'Realizar em (dias a partir de hoje)'}
        value={daysUntil}
        onChange={(e) => setDaysUntil(e.target.value)}
        margin="normal"
        sx={fieldSx}
      />

      <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} style={{ display: 'none' }} />
      <Card
        onClick={() => fileInputRef.current?.click()}
        sx={{
          borderRadius: 3, p: 2.5, textAlign: 'center', border: '2px dashed #dcbced',
          cursor: 'pointer', backgroundColor: '#fff', mt: 2,
        }}
      >
        <UploadFileIcon sx={{ fontSize: 32, color: '#634879', mb: 0.5 }} />
        <Typography sx={{ color: '#2b2338', fontWeight: 600, fontSize: '0.9rem' }}>
          {file ? file.name : 'Toque para anexar o PDF da receita'}
        </Typography>
      </Card>

      {status === 'uploading' && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ color: '#7a7186' }}>Enviando arquivo...</Typography>
          <LinearProgress
            variant="determinate"
            value={uploadProgress}
            sx={{ borderRadius: 2, height: 6, mt: 0.5, backgroundColor: '#f0eef3', '& .MuiLinearProgress-bar': { backgroundColor: '#634879' } }}
          />
        </Box>
      )}

      {error && (
        <Typography variant="body2" sx={{ color: '#d64545', mt: 2 }}>
          {error}
        </Typography>
      )}

      <Button
        fullWidth
        variant="contained"
        disabled={status === 'uploading' || status === 'saving'}
        onClick={handleSubmit}
        sx={{ mt: 3, backgroundColor: '#634879', borderRadius: 3, py: 1.3, fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#4f3a63' } }}
      >
        {status === 'uploading' || status === 'saving' ? (
          <CircularProgress size={22} sx={{ color: '#fff' }} />
        ) : (
          'Enviar receita'
        )}
      </Button>
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' },
}

const toggleSx = {
  textTransform: 'none',
  fontWeight: 600,
  '&.Mui-selected': { backgroundColor: '#634879', color: '#fff', '&:hover': { backgroundColor: '#4f3a63' } },
}
