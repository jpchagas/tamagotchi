import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { resetPassword } from '../services/authService'

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return

    setError('')
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      // Firebase intentionally doesn't reveal whether the email exists,
      // to avoid leaking which addresses are registered.
      setSent(true)
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
        Esqueceu sua senha?
      </Typography>
      <Typography variant="body2" sx={{ color: '#7a7186', mb: 4 }}>
        Informe seu e-mail e enviaremos um link para redefinir sua senha.
      </Typography>

      {sent ? (
        <Typography sx={{ color: '#3ba55c', fontWeight: 600 }}>
          Se esse e-mail estiver cadastrado, você receberá um link em instantes.
        </Typography>
      ) : (
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={fieldSx}
          />
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
            sx={{ mt: 3, py: 1.3, borderRadius: 3, backgroundColor: '#634879', fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#4f3a63' } }}
          >
            {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Enviar link'}
          </Button>
        </Box>
      )}

      <Typography sx={{ textAlign: 'center', mt: 3 }}>
        <Box component="span" onClick={onBack} sx={{ color: '#634879', fontWeight: 600, cursor: 'pointer' }}>
          Voltar para o login
        </Box>
      </Typography>
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: '#fff' },
}
