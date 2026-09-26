import { useState, useRef, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Card from '@mui/material/Card'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Autocomplete from '@mui/material/Autocomplete'
import LinearProgress from '@mui/material/LinearProgress'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { getCareTeam } from '../services/careTeamService'
import { uploadExamResultFile } from '../services/storageService'
import { createExamResultDraft, attachExamResultFile, markExamResultUploadFailed } from '../services/examReviewService'

export default function SubmitExamResultPage({ uid, profile, onBack }) {
  const fileInputRef = useRef(null)
  const [doctorOptions, setDoctorOptions] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('laboratorial')
  const [file, setFile] = useState(null)

  const [uploadProgress, setUploadProgress] = useState(0)
  const [status, setStatus] = useState('idle') // idle -> uploading -> saving -> done -> error
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) return
    getCareTeam(uid)
      .then((members) =>
        setDoctorOptions(members.filter((m) => m.memberType === 'doctor' && m.status !== 'pending'))
      )
      .catch(() => {})
  }, [uid])

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleSubmit = async () => {
    if (!title || !selectedDoctor || !file) {
      setError('Preencha o nome do exame, o médico solicitante e anexe o arquivo.')
      return
    }

    setError('')
    setStatus('saving')

    let examId = null
    try {
      // Creates the exam (and the doctor's review mirror) with
      // processingStatus 'pending' before the upload starts.
      examId = await createExamResultDraft({
        patientUid: uid,
        patientProfile: profile,
        doctorUid: selectedDoctor.doctorUid,
        doctorName: selectedDoctor.name,
        title,
        category,
      })

      setStatus('uploading')
      const { fileUrl } = await uploadExamResultFile(uid, examId, file, setUploadProgress)

      await attachExamResultFile(uid, selectedDoctor.doctorUid, examId, {
        attachmentUrl: fileUrl,
        attachmentFileName: file.name,
      })

      setStatus('done')
    } catch (err) {
      if (examId) {
        await markExamResultUploadFailed(uid, selectedDoctor.doctorUid, examId).catch(() => {})
      }
      setError('Não foi possível enviar o exame. Tente novamente.')
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
            Exame enviado!
          </Typography>
          <Typography variant="body2" sx={{ color: '#4a6b52', mb: 2 }}>
            Estamos lendo o arquivo automaticamente — isso pode levar alguns minutos.
            {selectedDoctor?.name && ` ${selectedDoctor.name} também vai revisar o resultado.`}
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
        Enviar resultado de exame
      </Typography>
      <Typography variant="body2" sx={{ color: '#7a7186', mb: 3 }}>
        Seu médico vai revisar o arquivo enviado.
      </Typography>

      <TextField
        fullWidth
        label="Nome do exame"
        placeholder="Ex: Hemograma completo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        margin="normal"
        sx={fieldSx}
      />

      <TextField select fullWidth label="Tipo de exame" value={category} onChange={(e) => setCategory(e.target.value)} margin="normal" sx={fieldSx}>
        <MenuItem value="laboratorial">Laboratorial</MenuItem>
        <MenuItem value="imagem">Imagem</MenuItem>
        <MenuItem value="documento">Documento</MenuItem>
      </TextField>

      <Autocomplete
        fullWidth
        options={doctorOptions}
        value={selectedDoctor}
        onChange={(_, value) => setSelectedDoctor(value)}
        getOptionLabel={(d) => d.name || ''}
        isOptionEqualToValue={(a, b) => a.doctorUid === b.doctorUid}
        renderOption={(props, option) => (
          <li {...props} key={option.doctorUid}>
            <Box>
              <Typography sx={{ fontSize: '0.9rem' }}>{option.name}</Typography>
              <Typography variant="caption" sx={{ color: '#7a7186' }}>{option.specialty}</Typography>
            </Box>
          </li>
        )}
        renderInput={(params) => (
          <TextField {...params} label="Médico solicitante" placeholder="Buscar na sua equipe..." margin="normal" sx={fieldSx} />
        )}
        noOptionsText="Nenhum médico na sua equipe ainda"
      />

      <input ref={fileInputRef} type="file" accept="application/pdf,image/png,image/jpeg" onChange={handleFileChange} style={{ display: 'none' }} />
      <Card
        onClick={() => fileInputRef.current?.click()}
        sx={{
          borderRadius: 3, p: 2.5, textAlign: 'center', border: '2px dashed #dcbced',
          cursor: 'pointer', backgroundColor: '#fff', mt: 2,
        }}
      >
        <UploadFileIcon sx={{ fontSize: 32, color: '#634879', mb: 0.5 }} />
        <Typography sx={{ color: '#2b2338', fontWeight: 600, fontSize: '0.9rem' }}>
          {file ? file.name : 'Toque para anexar o resultado (PDF, PNG ou JPG)'}
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
          'Enviar exame'
        )}
      </Button>
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' },
}
