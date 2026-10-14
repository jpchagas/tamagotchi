import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import CircularProgress from '@mui/material/CircularProgress'
import { PageHeader, FieldLabel, ActionBar } from './ui'
import { colors } from '../theme'
import { registerWithEmail } from '../services/authService'

const ERROR_MESSAGES = {
  'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
}

const ROLES = [
  { value: 'patient', label: 'Paciente', letter: 'P', hint: 'Acompanhar minha saúde e meus exames' },
  { value: 'doctor', label: 'Médico(a)', letter: 'M', hint: 'Acompanhar meus pacientes' },
]

export function RoleChoice({ value, onChange }) {
  return (
    <Box role="radiogroup" aria-label="Perfil" sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.25 }}>
      {ROLES.map((r) => {
        const on = r.value === value
        return (
          <ButtonBase
            key={r.value}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(r.value)}
            sx={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1, p: 1.75, borderRadius: '18px', textAlign: 'left', border: `2px solid ${on ? colors.brand : colors.line}`, backgroundColor: on ? colors.brandTint : colors.surface, transition: 'all 150ms' }}
          >
            <Box sx={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, backgroundColor: on ? colors.brand : colors.ground, color: on ? '#FFFFFF' : colors.muted }}>{r.letter}</Box>
            <Typography variant="subtitle1">{r.label}</Typography>
            <Typography variant="caption" sx={{ color: colors.muted, lineHeight: 1.35 }}>{r.hint}</Typography>
          </ButtonBase>
        )
      })}
    </Box>
  )
}

export function StepProgress({ step, total = 2 }) {
  return (
    <Box>
      <Typography variant="body2" sx={{ color: colors.muted, fontWeight: 700, mb: 1 }}>Passo {step} de {total}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))`, gap: 0.75 }}>
        {Array.from({ length: total }, (_, i) => (
          <Box key={i} sx={{ height: 4, borderRadius: 2, backgroundColor: i < step ? colors.brand : colors.segment }} />
        ))}
      </Box>
    </Box>
  )
}

function passwordStrength(password) {
  if (!password) return null
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++
  if (password.length < 6) return { level: 1, label: 'Muito curta', color: colors.alert }
  if (score <= 1) return { level: 2, label: 'Fraca', color: colors.warn }
  if (score <= 2) return { level: 3, label: 'Boa', color: colors.good }
  return { level: 4, label: 'Forte', color: colors.good }
}

// Step 1 of 2: account. Step 2 (CompleteProfilePage) opens once App's auth
// listener sees the new user; onDraft hands it the role, name and e-mail.
export default function CreateAccountPage({ onBack, onDraft }) {
  const [role, setRole] = useState('patient')
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field) => (e) => {
    const { value } = e.target
    setForm((f) => ({ ...f, [field]: value }))
  }
  const strength = passwordStrength(form.password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setError('Preencha nome, e-mail e senha.')
      return
    }
    setError('')
    setLoading(true)
    onDraft({ role, fullName: form.fullName.trim(), email: form.email.trim() })
    try {
      await registerWithEmail({ fullName: form.fullName.trim(), email: form.email.trim(), password: form.password })
    } catch (err) {
      onDraft(null)
      setError(ERROR_MESSAGES[err.code] || 'Não foi possível criar a conta. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ minHeight: '100dvh', backgroundColor: colors.surface, px: 3, pt: 3, pb: 18, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader onBack={onBack} title="Criar conta" subtitle="Como você vai usar o app?" />
      <StepProgress step={1} />
      <RoleChoice value={role} onChange={setRole} />

      <Box>
        <FieldLabel htmlFor="reg-name">Nome completo</FieldLabel>
        <TextField id="reg-name" fullWidth autoComplete="name" value={form.fullName} onChange={handleChange('fullName')} />
      </Box>
      <Box>
        <FieldLabel htmlFor="reg-email">E-mail</FieldLabel>
        <TextField id="reg-email" fullWidth type="email" autoComplete="email" value={form.email} onChange={handleChange('email')} />
      </Box>
      <Box>
        <FieldLabel htmlFor="reg-password">Senha</FieldLabel>
        <TextField id="reg-password" fullWidth type="password" autoComplete="new-password" value={form.password} onChange={handleChange('password')} />
        {strength && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 0.5, flexGrow: 1 }}>
              {[1, 2, 3, 4].map((i) => (
                <Box key={i} sx={{ height: 4, borderRadius: 2, backgroundColor: i <= strength.level ? strength.color : colors.segment }} />
              ))}
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: strength.color }}>{strength.label}</Typography>
          </Box>
        )}
      </Box>

      <Typography variant="body2" sx={{ color: colors.muted }}>
        {role === 'doctor' ? 'No próximo passo: CRM, UF e especialidade.' : 'No próximo passo: data de nascimento e alguns dados básicos.'}
      </Typography>
      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

      <ActionBar>
        <Button type="submit" fullWidth size="large" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Continuar'}
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center', color: colors.muted, mt: 1.5 }}>
          Já tem conta?{' '}
          <ButtonBase type="button" onClick={onBack} sx={{ fontWeight: 800, color: colors.brand, fontSize: 'inherit', borderRadius: 1, verticalAlign: 'baseline' }}>Entrar</ButtonBase>
        </Typography>
      </ActionBar>
    </Box>
  )
}
