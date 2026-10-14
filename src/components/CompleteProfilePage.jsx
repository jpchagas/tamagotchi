import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { PageHeader, FieldLabel, ChoiceChips, ActionBar } from './ui'
import { RoleChoice, StepProgress } from './CreateAccountPage'
import { colors } from '../theme'
import { saveUserProfile } from '../services/profileService'

const BR_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
]

const SEX_OPTIONS = ['Feminino', 'Masculino', 'Intersexo', 'Prefiro não informar'].map((v) => ({ value: v, label: v }))

function Field({ id, label, hint, ...props }) {
  return (
    <Box>
      <FieldLabel htmlFor={id} hint={hint}>{label}</FieldLabel>
      <TextField id={id} fullWidth {...props} />
    </Box>
  )
}

// Step 2 of 2: profile. `role` comes from step 1; it is missing after a
// first Google/Apple sign-in, so the role choice is shown here instead.
export default function CompleteProfilePage({ uid, role: initialRole, initialData = {}, onCancel, onSubmit }) {
  const [role, setRole] = useState(initialRole || 'patient')
  const [form, setForm] = useState({
    fullName: initialData.fullName || '',
    email: initialData.email || '',
    phone: '',
    dateOfBirth: '',
    cpf: '',
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

  const isDoctor = role === 'doctor'
  const set = (field) => (e) => {
    const { value } = e.target
    setForm((f) => ({ ...f, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const requiredCommon = ['fullName', 'email', 'phone', 'dateOfBirth', 'cpf', 'cityState']
    const requiredDoctor = ['crm', 'crmState', 'specialty']
    const missing = requiredCommon.some((f) => !form[f]) || (isDoctor && requiredDoctor.some((f) => !form[f]))
    if (missing) {
      setError('Preencha os campos obrigatórios.')
      return
    }

    setError('')
    setLoading(true)
    // Only the fields that apply to the role are saved.
    const roleFields = isDoctor
      ? { crm: form.crm, crmState: form.crmState, specialty: form.specialty, rqe: form.rqe }
      : { sexAssignedAtBirth: form.sexAssignedAtBirth, genderIdentity: form.genderIdentity }
    const { fullName, email, phone, dateOfBirth, cpf, country, cityState } = form
    const fullProfile = { role, fullName, email, phone, dateOfBirth, cpf, country, cityState, ...roleFields }
    try {
      await saveUserProfile(uid, fullProfile)
      onSubmit(fullProfile)
    } catch {
      setError('Não foi possível salvar seu cadastro. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ minHeight: '100dvh', backgroundColor: colors.surface, px: 3, pt: 3, pb: 14, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        onBack={onCancel}
        backLabel="Sair"
        title={isDoctor ? 'Seus dados profissionais' : 'Sobre você'}
        subtitle={isDoctor ? 'Seus pacientes verão nome, especialidade e CRM.' : 'Usamos isso para personalizar sua saúde.'}
      />
      <StepProgress step={2} />

      {!initialRole && (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700, color: colors.muted, mb: 1 }}>Como você vai usar o app?</Typography>
          <RoleChoice value={role} onChange={setRole} />
        </Box>
      )}

      {!initialData.fullName && <Field id="cp-name" label="Nome completo" autoComplete="name" value={form.fullName} onChange={set('fullName')} />}
      <Field id="cp-birth" label="Data de nascimento" type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} />
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.5 }}>
        <Field id="cp-cpf" label="CPF" slotProps={{ htmlInput: { inputMode: 'numeric' } }} value={form.cpf} onChange={set('cpf')} />
        <Field id="cp-phone" label="Telefone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
      </Box>
      <Field id="cp-city" label="Cidade/UF" placeholder="São Paulo/SP" value={form.cityState} onChange={set('cityState')} />

      {isDoctor ? (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 1.5 }}>
            <Field id="cp-crm" label="CRM" slotProps={{ htmlInput: { inputMode: 'numeric' } }} value={form.crm} onChange={set('crm')} />
            <Field id="cp-crm-uf" label="UF" select value={form.crmState} onChange={set('crmState')}>
              {BR_STATES.map((uf) => <MenuItem key={uf} value={uf}>{uf}</MenuItem>)}
            </Field>
          </Box>
          <Field id="cp-specialty" label="Especialidade" placeholder="Cardiologia" value={form.specialty} onChange={set('specialty')} />
          <Field id="cp-rqe" label="RQE" hint="(opcional)" value={form.rqe} onChange={set('rqe')} />
        </>
      ) : (
        <>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: colors.muted, mb: 1 }}>Sexo atribuído ao nascer</Typography>
            <ChoiceChips label="Sexo atribuído ao nascer" options={SEX_OPTIONS} value={form.sexAssignedAtBirth} onChange={(v) => setForm((f) => ({ ...f, sexAssignedAtBirth: v }))} />
          </Box>
          <Field id="cp-gender" label="Identidade de gênero" hint="(opcional, se for clinicamente relevante)" value={form.genderIdentity} onChange={set('genderIdentity')} />
        </>
      )}

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

      <ActionBar>
        <Button type="submit" fullWidth size="large" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Concluir cadastro'}
        </Button>
      </ActionBar>
    </Box>
  )
}
