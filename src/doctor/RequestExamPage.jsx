import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import AddIcon from '@mui/icons-material/AddRounded'
import { Page, PageHeader, FieldLabel, ChoiceChips, Segmented, ActionBar } from '../components/ui'
import FileField from '../components/FileField'
import { useToast } from '../components/toastContext'
import { colors } from '../theme'
import { uploadExamRequestFile } from '../services/storageService'
import { addExam, attachExamFile, markExamUploadFailed } from '../services/examsService'

const COMMON_EXAMS = [
  'Hemograma', 'Perfil lipídico', 'ApoB', 'Glicemia', 'HbA1c', 'TSH',
  'Vitamina D', 'Creatinina', 'Função hepática', 'Urina tipo 1',
]

const PRIORITIES = [
  { value: 'rotina', label: 'Rotina' },
  { value: 'prioritario', label: 'Prioritário' },
]

const DEADLINES = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
  { value: '180', label: '6 meses' },
]

// One request = one exam doc in the patient's agenda, titled with every
// exam chosen (they are usually collected in the same visit). An attached
// signed request is read by the Cloud Function into requestedExams.
export default function RequestExamPage({ doctorUid, doctorProfile, patient, onBack, onSent }) {
  const toast = useToast()
  const [selected, setSelected] = useState([])
  const [extra, setExtra] = useState([])
  const [custom, setCustom] = useState('')
  const [priority, setPriority] = useState('rotina')
  const [deadline, setDeadline] = useState('30')
  const [file, setFile] = useState(null)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  const sending = progress !== null
  const firstName = patient.patientName?.split(' ')[0] || 'paciente'
  const options = [...COMMON_EXAMS, ...extra].map((name) => ({ value: name, label: name }))
  const toggle = (name) => setSelected((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]))

  const addCustom = () => {
    const name = custom.trim()
    if (!name) return
    if (!options.some((o) => o.value.toLowerCase() === name.toLowerCase())) setExtra((x) => [...x, name])
    setSelected((s) => (s.includes(name) ? s : [...s, name]))
    setCustom('')
  }

  const send = async () => {
    if (selected.length === 0 && !file) return
    setError('')
    setProgress(0)
    let examId = null
    try {
      const scheduledDate = new Date()
      scheduledDate.setDate(scheduledDate.getDate() + Number(deadline))
      examId = await addExam(patient.patientId, {
        kind: 'request',
        title: selected.length > 0 ? selected.join(', ') : 'Pedido de exames',
        status: 'solicitado',
        priority,
        category: 'laboratorial',
        icon: 'lab',
        scheduledDate,
        doctorId: doctorUid,
        doctorName: doctorProfile?.fullName || '',
        ...(file && { processingStatus: 'pending' }),
      })
      if (file) {
        const { fileUrl } = await uploadExamRequestFile(patient.patientId, examId, file, setProgress)
        await attachExamFile(examId, { attachmentUrl: fileUrl, attachmentFileName: file.name })
      }
      toast(`Pedido enviado para ${firstName}`)
      onSent()
    } catch {
      if (examId && file) await markExamUploadFailed(examId).catch(() => {})
      setProgress(null)
      setError('Não foi possível enviar o pedido. Tente novamente.')
    }
  }

  const count = selected.length
  const label = count > 0 ? `Pedir ${count} ${count > 1 ? 'exames' : 'exame'}` : file ? 'Enviar pedido' : 'Escolha ao menos um exame'

  return (
    <Page bottomSpace={14} sx={{ backgroundColor: colors.surface, gap: 2.5 }}>
      <PageHeader onBack={onBack} backLabel="Fechar" title="Pedir exame" subtitle={`para ${patient.patientName}`} />

      <Box>
        <FieldLabel>Exames</FieldLabel>
        <ChoiceChips label="Exames" options={options} values={selected} onToggle={toggle} />
        <TextField
          fullWidth
          sx={{ mt: 1.5 }}
          placeholder="Outro exame"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          slotProps={{
            htmlInput: { 'aria-label': 'Outro exame' },
            input: {
              endAdornment: custom.trim() ? (
                <InputAdornment position="end">
                  <Button size="small" startIcon={<AddIcon />} onClick={addCustom} sx={{ minHeight: 36 }}>Adicionar</Button>
                </InputAdornment>
              ) : null,
            },
          }}
        />
      </Box>

      <Box>
        <FieldLabel>Prioridade</FieldLabel>
        <Segmented label="Prioridade" options={PRIORITIES} value={priority} onChange={setPriority} />
      </Box>

      <Box>
        <FieldLabel>Realizar em até</FieldLabel>
        <Segmented label="Realizar em até" options={DEADLINES} value={deadline} onChange={setDeadline} />
      </Box>

      <FileField file={file} onChange={setFile} onError={setError} label="Anexar pedido assinado (opcional)" disabled={sending} />

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

      <ActionBar>
        {sending && file && <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 2, mb: 1.25, backgroundColor: colors.segment }} />}
        <Button fullWidth size="large" variant="contained" onClick={send} disabled={sending || (count === 0 && !file)}>
          {sending ? 'Enviando…' : label}
        </Button>
      </ActionBar>
    </Page>
  )
}
