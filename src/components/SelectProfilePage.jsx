import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Avatar from '@mui/material/Avatar'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PersonIcon from '@mui/icons-material/Person'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'

const ROLES = [
  {
    id: 'patient',
    label: 'Paciente',
    description: 'Acompanhe sua saúde, exames, medicações e muito mais.',
    icon: <PersonIcon sx={{ color: '#634879' }} />,
  },
  {
    id: 'doctor',
    label: 'Médico',
    description: 'Acompanhe seus pacientes, agenda e condutas.',
    icon: <LocalHospitalIcon sx={{ color: '#634879' }} />,
  },
]

export default function SelectProfilePage({ onSelect, onGoToLogin }) {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f7f5fa', p: 3 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '1.4rem', color: '#2b2338', textAlign: 'center', mb: 0.5, mt: 4 }}>
        Quem você é?
      </Typography>
      <Typography variant="body2" sx={{ color: '#7a7186', textAlign: 'center', mb: 4 }}>
        Escolha como deseja acessar o Tamagotchi.
      </Typography>

      {ROLES.map((role) => (
        <Card
          key={role.id}
          onClick={() => onSelect(role.id)}
          sx={{
            borderRadius: 4,
            p: 2,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer',
            '&:hover': { backgroundColor: '#f0eef3' },
          }}
        >
          <Avatar sx={{ backgroundColor: '#ece5f5', width: 48, height: 48 }}>
            {role.icon}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>{role.label}</Typography>
            <Typography variant="body2" sx={{ color: '#7a7186' }}>
              {role.description}
            </Typography>
          </Box>
          <ChevronRightIcon sx={{ color: '#c9c2d1' }} />
        </Card>
      ))}

      <Typography sx={{ textAlign: 'center', mt: 3, color: '#7a7186' }}>
        Já tem uma conta?{' '}
        <Box
          component="span"
          onClick={onGoToLogin}
          sx={{ color: '#634879', fontWeight: 700, cursor: 'pointer' }}
        >
          Entrar
        </Box>
      </Typography>
    </Box>
  )
}
