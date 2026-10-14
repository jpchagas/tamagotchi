import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import CircularProgress from '@mui/material/CircularProgress'
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined'
import GoogleIcon from '@mui/icons-material/Google'
import AppleIcon from '@mui/icons-material/Apple'
import logo from '../assets/logo.png'
import { FieldLabel } from './ui'
import { colors } from '../theme'
import { loginWithEmail, loginWithGoogle, loginWithApple } from '../services/authService'

const ERROR_MESSAGES = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/too-many-requests': 'Muitas tentativas. Tente novamente em instantes.',
}

// After a successful sign-in App's auth listener takes over the navigation.
export default function LoginPage({ onForgotPassword, onCreateAccount }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Preencha e-mail e senha.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await loginWithEmail(email.trim(), password)
    } catch (err) {
      setError(ERROR_MESSAGES[err.code] || 'Não foi possível entrar. Tente novamente.')
      setLoading(false)
    }
  }

  const handleSocialLogin = async (providerFn) => {
    setError('')
    setLoading(true)
    try {
      await providerFn()
    } catch {
      setError('Não foi possível entrar com essa conta.')
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', backgroundColor: colors.surface, display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ backgroundColor: colors.brandTint, borderRadius: '0 0 36px 36px', pt: 7, pb: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
        <Box component="img" src={logo} alt="" sx={{ width: 76, height: 76, borderRadius: '24px', boxShadow: '0 12px 28px rgba(99,72,121,0.3)' }} />
        <Typography variant="h4" component="h1">Tamagotchi</Typography>
        <Typography variant="body2" sx={{ color: colors.muted }}>Sua saúde, com quem cuida de você.</Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ px: 3, pt: 3.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
          <TextField id="login-email" fullWidth type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Box>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <FieldLabel htmlFor="login-password">Senha</FieldLabel>
            <ButtonBase type="button" onClick={onForgotPassword} sx={{ fontSize: '0.8125rem', fontWeight: 700, color: colors.brand, mb: 1, borderRadius: 1 }}>
              Esqueci minha senha
            </ButtonBase>
          </Box>
          <TextField
            id="login-password"
            fullWidth
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'} edge="end">
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

        <Button type="submit" size="large" variant="contained" disabled={loading} sx={{ mt: 0.5 }}>
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Entrar'}
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: colors.muted, fontSize: '0.8125rem' }}>
          <Box sx={{ flexGrow: 1, height: '1px', backgroundColor: colors.line }} />ou<Box sx={{ flexGrow: 1, height: '1px', backgroundColor: colors.line }} />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
          <Button variant="outlined" size="large" disabled={loading} startIcon={<GoogleIcon />} onClick={() => handleSocialLogin(loginWithGoogle)}>Google</Button>
          <Button variant="outlined" size="large" disabled={loading} startIcon={<AppleIcon />} onClick={() => handleSocialLogin(loginWithApple)}>Apple</Button>
        </Box>
      </Box>

      <Typography variant="body2" sx={{ textAlign: 'center', color: colors.muted, mt: 'auto', py: 4 }}>
        Novo por aqui?{' '}
        <ButtonBase onClick={onCreateAccount} sx={{ fontWeight: 800, color: colors.brand, fontSize: 'inherit', borderRadius: 1, verticalAlign: 'baseline' }}>
          Criar conta
        </ButtonBase>
      </Typography>
    </Box>
  )
}
