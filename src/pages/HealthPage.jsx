import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FavoriteIcon from '@mui/icons-material/Favorite'
import PsychologyIcon from '@mui/icons-material/Psychology'
import CoronavirusIcon from '@mui/icons-material/Coronavirus'
import SpaIcon from '@mui/icons-material/Spa'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'

const CONDITIONS = [
  {
    id: 'cardiovascular',
    label: 'Cardiovascular',
    status: 'Em acompanhamento',
    statusColor: '#e08a3c',
    icon: <FavoriteIcon sx={{ color: '#e08a3c' }} />,
  },
  {
    id: 'cerebro',
    label: 'Cérebro',
    status: 'Ótimo',
    statusColor: '#3ba55c',
    icon: <PsychologyIcon sx={{ color: '#3ba55c' }} />,
  },
  {
    id: 'oncologico',
    label: 'Risco oncológico',
    status: '1 achado que exige ação',
    statusColor: '#d64545',
    icon: <CoronavirusIcon sx={{ color: '#d64545' }} />,
  },
  {
    id: 'metabolico',
    label: 'Metabólico',
    status: 'Melhorando',
    statusColor: '#3ba55c',
    icon: <SpaIcon sx={{ color: '#3ba55c' }} />,
  },
]

export default function HealthPage({ userName = 'André', onOpenCondition }) {
  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 1 }}>
        <Avatar sx={{ width: 44, height: 44, mr: 1.5 }}>👤</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>
            Bom dia, {userName}.
          </Typography>
          <Typography variant="body2" sx={{ color: '#7a7186' }}>
            Sua saúde em dia, com foco no que importa.
          </Typography>
        </Box>
        <IconButton>
          <NotificationsNoneIcon sx={{ color: '#2b2338' }} />
        </IconButton>
      </Box>

      {/* Sua saúde hoje */}
      <Card sx={{ borderRadius: 4, p: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 0.3 }}>
          Sua saúde hoje
        </Typography>
        <Typography variant="body2" sx={{ color: '#d64545', fontWeight: 600, mb: 1.5 }}>
          2 áreas precisam da sua atenção
        </Typography>

        {CONDITIONS.map((c) => (
          <Box
            key={c.id}
            onClick={() => onOpenCondition?.(c.id)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.2,
              borderBottom: '1px solid #f0eef3',
              cursor: 'pointer',
              '&:last-of-type': { borderBottom: 'none' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              {c.icon}
              <Typography sx={{ color: '#2b2338', fontWeight: 500 }}>
                {c.label}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" sx={{ color: c.statusColor, fontWeight: 600 }}>
                {c.status}
              </Typography>
              <ChevronRightIcon sx={{ color: '#c9c2d1', fontSize: 18 }} />
            </Box>
          </Box>
        ))}
      </Card>

      {/* O que mudou */}
      <Card sx={{ borderRadius: 4, p: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1.5 }}>
          O que mudou
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
          <MetricTile label="ApoB" value="14%" />
          <MetricTile label="Gordura visceral" value="8%" />
          <MetricTile label="HbA1c" value="Estável" flat />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: '#7a7186' }}>Sono</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
            <ArrowDownwardIcon sx={{ fontSize: 14, color: '#3ba55c' }} />
            <Typography variant="body2" sx={{ color: '#3ba55c', fontWeight: 600 }}>
              37 min/noite
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* Próxima melhor ação */}
      <Card
        sx={{
          borderRadius: 4,
          p: 2,
          backgroundColor: '#ece5f5',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <CalendarMonthIcon sx={{ color: '#634879' }} />
        <Box>
          <Typography variant="caption" sx={{ color: '#634879', fontWeight: 700 }}>
            PRÓXIMA MELHOR AÇÃO
          </Typography>
          <Typography sx={{ color: '#2b2338', fontWeight: 600 }}>
            Repetir ApoB + perfil lipídico
          </Typography>
          <Typography variant="body2" sx={{ color: '#7a7186' }}>
            Em 23 dias
          </Typography>
        </Box>
      </Card>
    </Box>
  )
}

function MetricTile({ label, value, flat }) {
  return (
    <Box
      sx={{
        flex: 1,
        backgroundColor: '#f7f5fa',
        borderRadius: 3,
        p: 1.2,
        textAlign: 'center',
      }}
    >
      <Typography variant="caption" sx={{ color: '#7a7186' }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3 }}>
        {!flat && <ArrowDownwardIcon sx={{ fontSize: 14, color: '#3ba55c' }} />}
        <Typography sx={{ fontWeight: 700, color: '#3ba55c' }}>{value}</Typography>
      </Box>
    </Box>
  )
}
