import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ChatBubbleOutlinedIcon from "@mui/icons-material/ChatBubbleOutlined"
import { getCareTeam, groupByMemberType } from '../services/careTeamService'

const SECTION_LABELS = {
  doctor: 'Médicos',
  nurse: 'Enfermagem',
  family: 'Família',
}

function subtitleFor(member) {
  if (member.memberType === 'doctor') return `${member.specialty || ''} · ${member.crm || ''}`.trim()
  if (member.memberType === 'nurse') return member.specialty || 'Enfermagem'
  if (member.memberType === 'family') return member.relationship || 'Família'
  return ''
}

export default function TeamPage({ uid, onBack }) {
  const [grouped, setGrouped] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) {
      setError('Usuário não identificado.')
      return
    }
    let cancelled = false

    getCareTeam(uid)
      .then((members) => {
        if (!cancelled) setGrouped(groupByMemberType(members))
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar sua equipe.')
      })

    return () => {
      cancelled = true
    }
  }, [uid])

  const sections = grouped
    ? ['doctor', 'nurse', 'family'].filter((type) => grouped[type].length > 0)
    : []

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

      {error && (
        <Typography variant="body2" sx={{ color: '#d64545', mb: 2 }}>
          {error}
        </Typography>
      )}

      {!grouped && !error && (
        <>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ height: 72, borderRadius: 4, mb: 1.2 }} />
          ))}
        </>
      )}

      {grouped && sections.length === 0 && !error && (
        <Typography variant="body2" sx={{ color: '#7a7186', mb: 2 }}>
          Nenhum profissional ou familiar adicionado ainda.
        </Typography>
      )}

      {grouped &&
        sections.map((type) => (
          <Box key={type} sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700 }}>
              {SECTION_LABELS[type].toUpperCase()}
            </Typography>
            {grouped[type].map((member) => (
              <Card
                key={member.id}
                sx={{
                  borderRadius: 4,
                  p: 1.6,
                  mt: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <Avatar sx={{ width: 48, height: 48 }}>👤</Avatar>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{member.name}</Typography>
                  <Typography variant="body2" sx={{ color: '#7a7186' }}>{subtitleFor(member)}</Typography>
                  {member.phone && (
                    <Typography variant="caption" sx={{ color: '#b3aebb' }}>{member.phone}</Typography>
                  )}
                </Box>
              </Card>
            ))}
          </Box>
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
