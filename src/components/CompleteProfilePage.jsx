import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { saveUserProfile } from '../services/profileService'

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
]

const SEX_OPTIONS = ['Feminino', 'Masculino', 'Intersexo', 'Prefiro não informar']

export default function CompleteProfilePage({ role, uid, initialData = {}, onBack, onSubmit }) {
  const isPatient = role === 'patient'
  const isDoctor = role === 'doctor'

  const [form, setForm] = useState({
    fullName: initialData.fullName || '',
    email: initialData.email || '',
    phone: '',
    dateOfBirth: '',
    cpf: initialData.cpf || '',
    country: 'Brasil',
    cityState: '',
    // Patient-only
    sexAssignedAtBirth: '',
    genderIdentity: '',
    // Doctor-only
    crm: '',
    crmState: '',
    specialty: '',
    rqe: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const requiredCommon = ['fullName', 'email', 'phone', 'dateOfBirth', 'cpf', 'country', 'cityState']
    const requiredDoctor = ['crm', 'crmState', 'specialty']
    const missingCommon = requiredCommon.some((f) => !form[f])
    const missingDoctor = isDoctor && requiredDoctor.some((f) => !form[f])

    if (missingCommon || missingDoctor) {
      setError('Preencha os campos obrigatórios.')
      return
    }

    setError('')
    setLoading(true)
    const fullProfile = { ...form, role }
    try {
      await saveUserProfile(uid, fullProfile)
      onSubmit(fullProfile)
    } catch (err) {
      setError('Não foi possível salvar seu cadastro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f7f5fa', p: 3, pb: 6 }}>
      <IconButton onClick={onBack} sx={{ mb: 1, ml: -1 }}>
        <ArrowBackIcon sx={{ color: '#2b2338' }} />
      </IconButton>

      <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: '#2b2338', mb: 0.5 }}>
        Complete seu cadastro
      </Typography>
      <Typography variant="body2" sx={{ color: '#7a7186', mb: 3 }}>
        {isPatient
          ? 'Só mais alguns dados para personalizar sua jornada de saúde.'
          : 'Confirme seus dados profissionais para continuar.'}
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700 }}>
          DADOS PESSOAIS
        </Typography>
        <TextField fullWidth placeholder="Nome completo" value={form.fullName} onChange={handleChange('fullName')} margin="normal" sx={fieldSx} />
        <TextField fullWidth placeholder="Email" type="email" value={form.email} onChange={handleChange('email')} margin="normal" sx={fieldSx} />
        <TextField fullWidth placeholder="Telefone" value={form.phone} onChange={handleChange('phone')} margin="normal" sx={fieldSx} />
        <TextField
          fullWidth
          label="Data de nascimento"
          type="date"
          value={form.dateOfBirth}
          onChange={handleChange('dateOfBirth')}
          margin="normal"
          InputLabelProps={{ shrink: true }}
          sx={fieldSx}
        />
        <TextField fullWidth placeholder="CPF" value={form.cpf} onChange={handleChange('cpf')} margin="normal" sx={fieldSx} />
        <TextField fullWidth placeholder="País" value={form.country} onChange={handleChange('country')} margin="normal" sx={fieldSx} />
        <TextField fullWidth placeholder="Cidade/Estado" value={form.cityState} onChange={handleChange('cityState')} margin="normal" sx={fieldSx} />

        {isPatient && (
          <>
            <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700, mt: 2, display: 'block' }}>
              INFORMAÇÕES ADICIONAIS
            </Typography>
            <TextField
              select
              fullWidth
              label="Sexo atribuído ao nascer"
              value={form.sexAssignedAtBirth}
              onChange={handleChange('sexAssignedAtBirth')}
              margin="normal"
              sx={fieldSx}
            >
              {SEX_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>{opt}</MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              placeholder="Identidade de gênero (opcional)"
              value={form.genderIdentity}
              onChange={handleChange('genderIdentity')}
              margin="normal"
              helperText="Preencha apenas se for clinicamente relevante."
              sx={fieldSx}
            />
          </>
        )}

        {isDoctor && (
          <>
            <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700, mt: 2, display: 'block' }}>
              DADOS PROFISSIONAIS
            </Typography>
            <TextField fullWidth placeholder="CRM" value={form.crm} onChange={handleChange('crm')} margin="normal" sx={fieldSx} />
            <TextField
              select
              fullWidth
              label="Estado do CRM"
              value={form.crmState}
              onChange={handleChange('crmState')}
              margin="normal"
              sx={fieldSx}
            >
              {BR_STATES.map((uf) => (
                <MenuItem key={uf} value={uf}>{uf}</MenuItem>
              ))}
            </TextField>
            <TextField fullWidth placeholder="Especialidade" value={form.specialty} onChange={handleChange('specialty')} margin="normal" sx={fieldSx} />
            <TextField fullWidth placeholder="RQE (opcional)" value={form.rqe} onChange={handleChange('rqe')} margin="normal" sx={fieldSx} />
          </>
        )}

        {error && (
          <Typography variant="body2" sx={{ color: '#d64545', mt: 1 }}>
            {error}
          </Typography>
        )}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{
            mt: 3,
            py: 1.3,
            borderRadius: 3,
            backgroundColor: '#634879',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { backgroundColor: '#4f3a63' },
          }}
        >
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Concluir cadastro'}
        </Button>
      </Box>
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    backgroundColor: '#fff',
  },
}
