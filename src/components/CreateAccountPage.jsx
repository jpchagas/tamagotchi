import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { registerWithEmail } from '../services/authService'

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
}

export default function CreateAccountPage({ onBack, onNext, onGoToLogin }) {
  const [form, setForm] = useState({ fullName: '', email: '', cpf: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName || !form.email || !form.cpf || !form.password) {
      setError('Preencha todos os campos.')
      return
    }

    setError('')
    setLoading(true)
    try {
      const user = await registerWithEmail(form)
      onNext({ uid: user.uid, fullName: form.fullName, email: form.email, cpf: form.cpf })
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Não foi possível criar a conta. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f7f5fa', p: 3 }}>
      <IconButton onClick={onBack} sx={{ mb: 2, ml: -1 }}>
        <ArrowBackIcon sx={{ color: '#2b2338' }} />
      </IconButton>

      <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: '#2b2338', mb: 1 }}>
        Criar conta
      </Typography>
      <Typography variant="body2" sx={{ color: '#7a7186', mb: 4 }}>
        Vamos começar sua jornada de saúde.
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <TextField fullWidth placeholder="Nome completo" value={form.fullName} onChange={handleChange('fullName')} margin="normal" sx={fieldSx} />
        <TextField fullWidth placeholder="Email" type="email" value={form.email} onChange={handleChange('email')} margin="normal" sx={fieldSx} />
        <TextField fullWidth placeholder="CPF" value={form.cpf} onChange={handleChange('cpf')} margin="normal" sx={fieldSx} />
        <TextField fullWidth placeholder="Senha" type="password" value={form.password} onChange={handleChange('password')} margin="normal" sx={fieldSx} />

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
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Criar conta'}
        </Button>
      </Box>

      <Typography sx={{ textAlign: 'center', mt: 3, color: '#7a7186' }}>
        Já tem uma conta?{' '}
        <Box component="span" onClick={onGoToLogin} sx={{ color: '#634879', fontWeight: 700, cursor: 'pointer' }}>
          Entrar
        </Box>
      </Typography>
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' },
}
