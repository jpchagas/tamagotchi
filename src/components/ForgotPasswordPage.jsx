import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import LockIcon from '@mui/icons-material/LockOutlined'
import MailIcon from '@mui/icons-material/MarkEmailReadOutlined'
import { PageHeader, FieldLabel } from './ui'
import { colors } from '../theme'
import { resetPassword } from '../services/authService'

function Badge({ icon, tone }) {
  return (
    <Box sx={{ width: 64, height: 64, borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: tone === 'good' ? colors.goodBg : colors.brandTint, color: tone === 'good' ? colors.good : colors.brand }}>
      {icon}
    </Box>
  )
}

export default function ForgotPasswordPage({ onBack }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await resetPassword(email.trim())
    } catch {
      // Shown as sent either way: revealing whether the e-mail has an
      // account would leak which addresses are registered.
    } finally {
      setLoading(false)
      setSent(true)
    }
  }

  return (
    <Box sx={{ minHeight: '100dvh', backgroundColor: colors.surface, px: 3, pt: 3, pb: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <PageHeader onBack={onBack} title="" />

      {sent ? (
        <>
          <Badge tone="good" icon={<MailIcon sx={{ fontSize: 30 }} />} />
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Confira seu e-mail</Typography>
            <Typography sx={{ color: colors.muted, lineHeight: 1.6 }}>
              Se existir uma conta com <b>{email.trim()}</b>, o link chega em alguns minutos. Veja também a caixa de spam.
            </Typography>
          </Box>
          <Button size="large" variant="contained" onClick={onBack}>Voltar para entrar</Button>
          <Button onClick={() => setSent(false)}>Não recebi, enviar de novo</Button>
        </>
      ) : (
        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Badge icon={<LockIcon sx={{ fontSize: 30 }} />} />
          <Box>
            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>Esqueceu a senha?</Typography>
            <Typography sx={{ color: colors.muted, lineHeight: 1.6 }}>
              Digite o e-mail da sua conta e enviaremos um link para criar uma nova senha.
            </Typography>
          </Box>
          <Box>
            <FieldLabel htmlFor="reset-email">E-mail</FieldLabel>
            <TextField id="reset-email" fullWidth autoFocus type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Box>
          <Button type="submit" size="large" variant="contained" disabled={loading || !email.trim()}>
            {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Enviar link'}
          </Button>
        </Box>
      )}
    </Box>
  )
}
