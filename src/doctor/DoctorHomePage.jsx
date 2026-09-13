import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import LogoutIcon from '@mui/icons-material/Logout'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EventRepeatOutlinedIcon from '@mui/icons-material/EventRepeatOutlined'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'

const ALERTS = [
  { icon: <ScienceOutlinedIcon sx={{ color: '#634879' }} />, label: 'ApoB acima da meta', count: '6 pacientes' },
  { icon: <DescriptionOutlinedIcon sx={{ color: '#634879' }} />, label: 'Exames de imagem', count: '3 pacientes' },
  { icon: <EventRepeatOutlinedIcon sx={{ color: '#634879' }} />, label: 'Retorno de consulta', count: '4 pacientes' },
  { icon: <AssignmentOutlinedIcon sx={{ color: '#634879' }} />, label: 'Prescrições a revisar', count: '2 pacientes' },
]

function StatCard({ label, value, delta, deltaColor = '#3ba55c' }) {
  return (
    <Card sx={{ borderRadius: 4, p: 2, flex: 1 }}>
      <Typography variant="body2" sx={{ color: '#7a7186', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, color: '#2b2338', fontSize: '1.8rem' }}>
        {value}
      </Typography>
      {delta && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, mt: 0.3 }}>
          <ArrowUpwardIcon sx={{ fontSize: 14, color: deltaColor }} />
          <Typography variant="caption" sx={{ color: deltaColor, fontWeight: 600 }}>
            {delta}
          </Typography>
        </Box>
      )}
    </Card>
  )
}

export default function DoctorHomePage({ doctorName = 'Ricardo', onLogout }) {
  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, mt: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, color: '#2b2338', fontSize: '1.2rem' }}>
            Painel do médico
          </Typography>
          <Typography variant="body2" sx={{ color: '#7a7186' }}>
            Bom dia, Dr. {doctorName}!
          </Typography>
        </Box>
        <Box>
          <IconButton>
            <NotificationsNoneIcon sx={{ color: '#2b2338' }} />
          </IconButton>
          <IconButton onClick={onLogout} aria-label="Sair">
            <LogoutIcon sx={{ color: '#2b2338' }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
        <StatCard label="Pacientes em acompanhamento" value="248" delta="12% vs. mês anterior" />
        <StatCard label="Pendências" value="37" delta="1,5% do total" deltaColor="#e08a3c" />
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <StatCard label="Exames a revisar" value="12" />
        <StatCard label="Consultas hoje" value="8" />
      </Box>

      <Card sx={{ borderRadius: 4, p: 2 }}>
        <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1.5 }}>
          Alertas e pendências
        </Typography>
        {ALERTS.map((a, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.1,
              borderBottom: i < ALERTS.length - 1 ? '1px solid #f0eef3' : 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              {a.icon}
              <Typography sx={{ color: '#2b2338' }}>{a.label}</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#7a7186', fontWeight: 600 }}>
              {a.count}
            </Typography>
          </Box>
        ))}
      </Card>
    </Box>
  )
}
