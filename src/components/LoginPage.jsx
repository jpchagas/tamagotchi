import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import GoogleIcon from '@mui/icons-material/Google'
import AppleIcon from '@mui/icons-material/Apple'
import logo from '../assets/logo.png'
import { loginWithEmail, loginWithGoogle, loginWithApple } from '../services/authService'

const ERROR_MESSAGES = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente em instantes.',
}

export default function LoginPage({ onLogin, onForgotPassword, onCreateAccount }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identifier || !password) {
      setError('Preencha e-mail/CPF e senha.')
      return
    }

    // CPF login isn't supported by Firebase Auth directly — it needs a
    // server-side lookup from CPF to the account's email first.
    if (!identifier.includes('@')) {
      setError('Por enquanto, entre com seu e-mail (login por CPF em breve).')
      return
    }

    setError('')
    setLoading(true)
    try {
      const user = await loginWithEmail(identifier, password)
      onLogin(user)
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Não foi possível entrar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSocialLogin = async (providerFn) => {
    setError('')
    setLoading(true)
    try {
      const user = await providerFn()
      onLogin(user)
    } catch (err) {
      setError('Não foi possível entrar com essa conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #634879 0%, #b597d2 100%)',
        p: 3,
      }}
    >
      <Box component="img" src={logo} alt="Tamagotchi" sx={{ width: 72, height: 72, mb: 1.5 }} />
      <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.6rem', mb: 0.3 }}>
        Tamagotchi
      </Typography>
      <Typography sx={{ color: '#dcbced', mb: 4 }}>Sua saúde. Em evolução.</Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', maxWidth: 340 }}>
        <TextField
          fullWidth
          placeholder="E-mail ou CPF"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          margin="normal"
          sx={fieldSx}
        />
        <TextField
          fullWidth
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          sx={fieldSx}
        />

        <Box sx={{ textAlign: 'right', mt: 0.5 }}>
          <Button onClick={onForgotPassword} sx={{ color: '#dcbced', textTransform: 'none', p: 0, minWidth: 0 }}>
            Esqueceu sua senha?
          </Button>
        </Box>

        {error && (
          <Typography variant="body2" sx={{ color: '#ffd3d3', mt: 1 }}>
            {error}
          </Typography>
        )}

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={loading}
          sx={{
            mt: 2.5,
            py: 1.3,
            borderRadius: 3,
            backgroundColor: '#8a63b0',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': { backgroundColor: '#9b78bd' },
          }}
        >
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Entrar'}
        </Button>

        <Divider sx={{ my: 3, color: '#dcbced', '&::before, &::after': { borderColor: 'rgba(255,255,255,0.3)' } }}>
          <Typography variant="body2" sx={{ color: '#dcbced' }}>Ou continue com</Typography>
        </Divider>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={() => handleSocialLogin(loginWithGoogle)}
            sx={{ backgroundColor: '#fff', color: '#2b2338', borderRadius: 3, py: 1, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#f0eef3' } }}
          >
            Google
          </Button>
          <Button
            fullWidth
            startIcon={<AppleIcon />}
            onClick={() => handleSocialLogin(loginWithApple)}
            sx={{ backgroundColor: '#fff', color: '#2b2338', borderRadius: 3, py: 1, textTransform: 'none', fontWeight: 600, '&:hover': { backgroundColor: '#f0eef3' } }}
          >
            Apple
          </Button>
        </Box>

        <Typography sx={{ color: '#dcbced', textAlign: 'center', mt: 3 }}>
          Não tem uma conta?{' '}
          <Box component="span" onClick={onCreateAccount} sx={{ color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            Criar conta
          </Box>
        </Typography>
      </Box>
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.95)' },
}
