import { useState, useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import PhotoCameraIcon from '@mui/icons-material/PhotoCameraOutlined'
import UploadFileIcon from '@mui/icons-material/UploadFileOutlined'
import CloseIcon from '@mui/icons-material/CloseRounded'
import PersonAddIcon from '@mui/icons-material/PersonAddAltRounded'
import { BottomSheet, PersonAvatar, FieldLabel, ChoiceChips, EmptyState } from '../components/ui'
import { useToast } from '../components/toastContext'
import { colors } from '../theme'
import { getPatientCareLinks } from '../services/careTeamService'
import { createExamResultDraft } from '../services/examReviewService'
import { attachExamFile, markExamUploadFailed } from '../services/examsService'
import { uploadExamResultFile } from '../services/storageService'
import { validateFile, SUPPORTED_TYPES } from '../components/fileRules'

const CATEGORIES = [
  { value: 'laboratorial', label: 'Laboratorial' },
  { value: 'imagem', label: 'Imagem' },
  { value: 'documento', label: 'Outro' },
]

function formatSize(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.round(bytes / 1024)} KB`
}

// "laudo_lipidograma-2026.pdf" -> "Laudo lipidograma 2026"
function titleFromFileName(name) {
  const base = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : 'Resultado de exame'
}

export default function UploadExamSheet({ open, uid, profile, onClose, onSent, onOpenTeam }) {
  const toast = useToast()
  const cameraInput = useRef(null)
  const fileInput = useRef(null)
  const [doctors, setDoctors] = useState(null)
  const [doctorId, setDoctorId] = useState(null)
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('laboratorial')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !uid) return
    let cancelled = false
    getPatientCareLinks(uid)
      .then((links) => {
        if (cancelled) return
        const confirmed = links.filter((l) => l.status === 'confirmed')
        setDoctors(confirmed)
        setDoctorId((current) => current || (confirmed.length === 1 ? confirmed[0].doctorId : null))
      })
      .catch(() => !cancelled && setDoctors([]))
    return () => {
      cancelled = true
    }
  }, [open, uid])

  const reset = () => {
    setFile(null)
    setTitle('')
    setCategory('laboratorial')
    setProgress(null)
    setError('')
  }

  const close = () => {
    if (progress !== null) return // don't drop an upload in flight
    reset()
    onClose()
  }

  const pickFile = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const problem = validateFile(f)
    setError(problem)
    if (!problem) setFile(f)
  }

  const doctor = doctors?.find((d) => d.doctorId === doctorId)

  const send = async () => {
    if (!file || !doctor) return
    setError('')
    setProgress(0)
    let examId = null
    try {
      // The exam doc must exist before the upload: its id is in the Storage
      // path the Cloud Function reads (see examReviewService).
      examId = await createExamResultDraft({
        patientUid: uid,
        patientProfile: profile,
        doctorUid: doctor.doctorId,
        doctorName: doctor.doctorName,
        title: title.trim() || titleFromFileName(file.name),
        category,
      })
      const { fileUrl } = await uploadExamResultFile(uid, examId, file, setProgress)
      await attachExamFile(examId, { attachmentUrl: fileUrl, attachmentFileName: file.name })
      toast(`Exame enviado para ${doctor.doctorName}. Os valores aparecem assim que forem lidos.`)
      reset()
      onSent?.()
      onClose()
    } catch {
      if (examId) await markExamUploadFailed(examId).catch(() => {})
      setProgress(null)
      setError('Não foi possível enviar o exame. Tente novamente.')
    }
  }

  const sending = progress !== null

  return (
    <BottomSheet open={open} onClose={close} title="Enviar resultado" subtitle="Lemos o documento e extraímos os valores para você.">
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={pickFile} />
      <input ref={fileInput} type="file" accept={SUPPORTED_TYPES.join(',')} hidden onChange={pickFile} />

      {doctors && doctors.length === 0 ? (
        <EmptyState
          icon={<PersonAddIcon />}
          title="Adicione seu médico primeiro"
          action={<Button variant="contained" onClick={onOpenTeam}>Ir para Equipe</Button>}
        >
          O resultado vai para um médico da sua equipe revisar.
        </EmptyState>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
          {file ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '16px', backgroundColor: colors.ground }}>
              <Box sx={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 800, color: file.type === 'application/pdf' ? colors.alert : colors.info, flexShrink: 0 }}>
                {file.type === 'application/pdf' ? 'PDF' : 'IMG'}
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" noWrap>{file.name}</Typography>
                <Typography variant="caption" sx={{ color: colors.muted }}>{formatSize(file.size)} · pronto para enviar</Typography>
              </Box>
              <IconButton onClick={() => setFile(null)} disabled={sending} aria-label="Remover arquivo"><CloseIcon /></IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
              {[
                { ref: cameraInput, icon: PhotoCameraIcon, label: 'Tirar foto' },
                { ref: fileInput, icon: UploadFileIcon, label: 'Escolher arquivo' },
              ].map(({ ref, icon: Icon, label }) => (
                <ButtonBase key={label} onClick={() => ref.current?.click()} sx={{ flexDirection: 'column', gap: 1, height: 96, borderRadius: '18px', border: `1px solid ${colors.line}`, backgroundColor: colors.ground, fontWeight: 700, fontSize: '0.875rem' }}>
                  <Icon sx={{ color: colors.brand }} />
                  {label}
                </ButtonBase>
              ))}
            </Box>
          )}

          <Box>
            <FieldLabel>Para revisão de</FieldLabel>
            {!doctors ? (
              <Skeleton variant="rounded" height={64} sx={{ borderRadius: '16px' }} />
            ) : doctors.length === 1 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25, borderRadius: '16px', border: `1px solid ${colors.line}` }}>
                <PersonAvatar name={doctor?.doctorName} size={40} />
                <Box>
                  <Typography variant="subtitle1">{doctor?.doctorName}</Typography>
                  <Typography variant="caption" sx={{ color: colors.muted }}>{doctor?.doctorSpecialty || 'Seu médico'}</Typography>
                </Box>
              </Box>
            ) : (
              <ChoiceChips
                label="Médico"
                options={doctors.map((d) => ({ value: d.doctorId, label: d.doctorName }))}
                value={doctorId}
                onChange={setDoctorId}
              />
            )}
          </Box>

          <Box>
            <FieldLabel>Tipo</FieldLabel>
            <ChoiceChips label="Tipo de exame" options={CATEGORIES} value={category} onChange={setCategory} />
          </Box>

          <Box>
            <FieldLabel htmlFor="upload-title" hint="(opcional)">Nome do exame</FieldLabel>
            <TextField id="upload-title" fullWidth placeholder={file ? titleFromFileName(file.name) : 'Ex: Hemograma'} value={title} onChange={(e) => setTitle(e.target.value)} disabled={sending} />
          </Box>

          {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

          {sending && (
            <Box>
              <Typography variant="caption" sx={{ color: colors.muted }}>Enviando… {Math.round(progress)}%</Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ mt: 0.5, height: 6, borderRadius: 3, backgroundColor: colors.segment }} />
            </Box>
          )}

          <Button size="large" variant="contained" onClick={send} disabled={!file || !doctor || sending}>
            {sending ? 'Enviando…' : !file ? 'Escolha um arquivo' : !doctor ? 'Escolha o médico' : 'Enviar exame'}
          </Button>
        </Box>
      )}
    </BottomSheet>
  )
}
