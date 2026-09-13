import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChatBubbleOutlinedIcon from "@mui/icons-material/ChatBubbleOutlined";

const TEAM = [
  { name: 'Dr. Ricardo Almeida', role: 'Cardiologista', crm: 'CRM 12345' },
  { name: 'Dra. Mariana Costa', role: 'Oncologista', crm: 'CRM 67890' },
  { name: 'Dr. Felipe Martins', role: 'Clínico geral', crm: 'CRM 54321' },
]

export default function TeamPage({ onBack }) {
  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        {onBack && (
          <IconButton onClick={onBack} sx={{ mr: 0.5 }}>
            <ArrowBackIcon sx={{ color: '#2b2338' }} />
          </IconButton>
        )}
        <Box>
          <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>Equipe médica</Typography>
          <Typography variant="body2" sx={{ color: '#7a7186' }}>
            Sua equipe de cuidado.
          </Typography>
        </Box>
      </Box>

      <Typography variant="body2" sx={{ color: '#7a7186', mb: 1.5 }}>
        Profissionais que acompanham sua jornada.
      </Typography>

      {TEAM.map((doc) => (
        <Card
          key={doc.name}
          sx={{
            borderRadius: 4,
            p: 1.6,
            mb: 1.2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Avatar sx={{ width: 48, height: 48 }}>👤</Avatar>
          <Box>
            <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{doc.name}</Typography>
            <Typography variant="body2" sx={{ color: '#7a7186' }}>{doc.role}</Typography>
            <Typography variant="caption" sx={{ color: '#b3aebb' }}>{doc.crm}</Typography>
          </Box>
        </Card>
      ))}

      <Button
        fullWidth
        variant="contained"
        sx={{
          backgroundColor: '#ece5f5',
          color: '#634879',
          boxShadow: 'none',
          borderRadius: 3,
          py: 1.2,
          fontWeight: 600,
          mb: 2,
          '&:hover': { backgroundColor: '#dcbced', boxShadow: 'none' },
        }}
      >
        Gerenciar equipe
      </Button>

      <Card sx={{ borderRadius: 4, p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <ChatBubbleOutlinedIcon sx={{ color: '#634879' }} />
          <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>
            Precisa falar com sua equipe?
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#7a7186', mb: 1.5 }}>
          Agende uma consulta ou tire suas dúvidas pelo chat.
        </Typography>
        <Button
          fullWidth
          variant="contained"
          sx={{ backgroundColor: '#634879', borderRadius: 3, py: 1.2, fontWeight: 600, '&:hover': { backgroundColor: '#4f3a63' } }}
        >
          Falar com a equipe
        </Button>
      </Card>
    </Box>
  )
}
