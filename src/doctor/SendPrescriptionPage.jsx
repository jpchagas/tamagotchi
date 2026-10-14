import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import LinearProgress from '@mui/material/LinearProgress'
import { Page, PageHeader, FieldLabel, ChoiceChips, Segmented, ActionBar } from '../components/ui'
import FileField from '../components/FileField'
import { useToast } from '../components/toastContext'
import { colors } from '../theme'
import { uploadConductPrescriptionFile } from '../services/storageService'
import { addConduct, attachConductFile, markConductUploadFailed } from '../services/conductsService'

const TYPES = [
  { value: 'medication', label: 'Medicação', placeholder: 'Ex: Tomar rosuvastatina 10 mg à noite' },
  { value: 'diet', label: 'Dieta', placeholder: 'Ex: Reduzir carnes gordurosas' },
  { value: 'exercise', label: 'Exercício', placeholder: 'Ex: Caminhar 30 min, 5x por semana' },
  { value: 'followup', label: 'Acompanhamento', placeholder: 'Ex: Retorno com exames' },
]

// The timeframe also sets the due date the patient sees ("Em 7 dias").
const TIMEFRAMES = [
  { value: 'agora', label: 'Agora', days: 7 },
  { value: 'proximos90', label: '90 dias', days: 90 },
  { value: 'esteAno', label: 'Este ano', days: 365 },
  { value: 'longoPrazo', label: 'Contínuo', days: null },
]

function daysFromNow(days) {
  if (days === null) return null
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export default function SendPrescriptionPage({ doctorUid, doctorProfile, patient, onBack, onSent }) {
  const toast = useToast()
  const [file, setFile] = useState(null)
  const [type, setType] = useState('medication')
  const [title, setTitle] = useState('')
  const [timeframe, setTimeframe] = useState('agora')
  const [why, setWhy] = useState('')
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  const sending = progress !== null
  const typeInfo = TYPES.find((t) => t.value === type)
  const firstName = patient.patientName?.split(' ')[0] || 'paciente'

  const send = async () => {
    if (!title.trim()) {
      setError('Dê um título para a paciente ver no plano.')
      return
    }
    setError('')
    setProgress(0)
    let conductId = null
    try {
      // Created (with processingStatus 'pending' when there is a file)
      // BEFORE the upload: the Storage path carries its id.
      conductId = await addConduct(patient.patientId, {
        title: title.trim(),
        why: why.trim(),
        type,
        timeframe,
        dueDate: daysFromNow(TIMEFRAMES.find((t) => t.value === timeframe).days),
        doctorId: doctorUid,
        doctorName: doctorProfile?.fullName || '',
        ...(file && { processingStatus: 'pending' }),
      })
      if (file) {
        const { fileUrl } = await uploadConductPrescriptionFile(patient.patientId, conductId, file, setProgress)
        await attachConductFile(conductId, { attachmentUrl: fileUrl, attachmentFileName: file.name })
      }
      toast(`Enviado para ${firstName}`)
      onSent()
    } catch {
      if (conductId && file) await markConductUploadFailed(conductId).catch(() => {})
      setProgress(null)
      setError('Não foi possível enviar. Tente novamente.')
    }
  }

  return (
    <Page bottomSpace={14} sx={{ backgroundColor: colors.surface, gap: 2.5 }}>
      <PageHeader onBack={onBack} backLabel="Fechar" title="Enviar receita" subtitle={`para ${patient.patientName}`} />

      <FileField file={file} onChange={setFile} onError={setError} label="Anexar receita" hint="os medicamentos serão lidos do arquivo" disabled={sending} />

      <Box>
        <FieldLabel>Tipo</FieldLabel>
        <ChoiceChips label="Tipo" options={TYPES} value={type} onChange={setType} />
      </Box>

      <Box>
        <FieldLabel htmlFor="rx-title">Título para {firstName}</FieldLabel>
        <TextField id="rx-title" fullWidth placeholder={typeInfo.placeholder} value={title} onChange={(e) => setTitle(e.target.value)} disabled={sending} />
      </Box>

      <Box>
        <FieldLabel>Prazo</FieldLabel>
        <Segmented label="Prazo" options={TIMEFRAMES} value={timeframe} onChange={setTimeframe} />
      </Box>

      <Box>
        <FieldLabel htmlFor="rx-why" hint={`(${firstName} vê isso no plano)`}>Por quê?</FieldLabel>
        <TextField id="rx-why" fullWidth multiline minRows={3} placeholder="Explique o motivo em linguagem simples" value={why} onChange={(e) => setWhy(e.target.value)} disabled={sending} />
      </Box>

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

      <ActionBar>
        {sending && file && <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 2, mb: 1.25, backgroundColor: colors.segment }} />}
        <Button fullWidth size="large" variant="contained" onClick={send} disabled={sending}>
          {sending ? 'Enviando…' : `Enviar para ${firstName}`}
        </Button>
      </ActionBar>
    </Page>
  )
}
