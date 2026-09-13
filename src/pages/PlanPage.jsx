import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AlarmIcon from '@mui/icons-material/Alarm'
import ScienceIcon from '@mui/icons-material/Science'
import EventIcon from '@mui/icons-material/Event'
import VaccinesIcon from '@mui/icons-material/Vaccines'
import BloodtypeIcon from '@mui/icons-material/Bloodtype'

const PLANO_TABS = ['Agora', 'Próximos 90 dias', 'Este ano', 'Longo prazo']
const AGENDA_TABS = ['Solicitados', 'Em andamento', 'Realizados']

const PLANO_ITEMS = [
  {
    icon: <AlarmIcon sx={{ color: '#634879' }} />,
    title: 'Repetir ApoB + perfil lipídico',
    when: 'Em 23 dias',
    why: 'Seu ApoB melhorou após o tratamento, mas ainda permanece acima da sua meta personalizada.',
  },
  {
    icon: <AlarmIcon sx={{ color: '#634879' }} />,
    title: 'Acompanhamento oncológico',
    when: 'Em 30 dias',
    why: 'Achado que exige investigação complementar.',
  },
]

const AGENDA_ITEMS = [
  { icon: <ScienceIcon sx={{ color: '#634879' }} />, title: 'ApoB + Perfil lipídico', when: 'Em 23 dias', tag: 'Prioritário', tagColor: '#d64545', tagBg: '#fdeceb' },
  { icon: <EventIcon sx={{ color: '#634879' }} />, title: 'Colonoscopia', when: 'Em 30 dias', tag: 'Prioritário', tagColor: '#d64545', tagBg: '#fdeceb' },
  { icon: <VaccinesIcon sx={{ color: '#634879' }} />, title: 'Vitamina D', when: 'Em 60 dias', tag: 'Rotina', tagColor: '#3ba55c', tagBg: '#e6f5ea' },
  { icon: <EventIcon sx={{ color: '#634879' }} />, title: 'Ressonância de crânio', when: 'Em 90 dias', tag: 'Rotina', tagColor: '#3ba55c', tagBg: '#e6f5ea' },
  { icon: <BloodtypeIcon sx={{ color: '#634879' }} />, title: 'Hemograma completo', when: 'Em 6 meses', tag: 'Rotina', tagColor: '#3ba55c', tagBg: '#e6f5ea' },
]

export default function PlanPage() {
  const [view, setView] = useState('plano') // 'plano' | 'agenda'
  const [planoTab, setPlanoTab] = useState('Agora')
  const [agendaTab, setAgendaTab] = useState('Solicitados')

  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          onClick={() => setView('plano')}
          sx={{
            flex: 1,
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 700,
            backgroundColor: view === 'plano' ? '#634879' : '#fff',
            color: view === 'plano' ? '#fff' : '#7a7186',
            '&:hover': { backgroundColor: view === 'plano' ? '#634879' : '#f0eef3' },
          }}
        >
          Plano
        </Button>
        <Button
          onClick={() => setView('agenda')}
          sx={{
            flex: 1,
            borderRadius: 3,
            textTransform: 'none',
            fontWeight: 700,
            backgroundColor: view === 'agenda' ? '#634879' : '#fff',
            color: view === 'agenda' ? '#fff' : '#7a7186',
            '&:hover': { backgroundColor: view === 'agenda' ? '#634879' : '#f0eef3' },
          }}
        >
          Agenda
        </Button>
      </Box>

      {view === 'plano' ? (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto' }}>
            {PLANO_TABS.map((t) => (
              <Chip
                key={t}
                label={t}
                onClick={() => setPlanoTab(t)}
                sx={{
                  backgroundColor: planoTab === t ? '#634879' : '#fff',
                  color: planoTab === t ? '#fff' : '#7a7186',
                  fontWeight: 600,
                  border: planoTab === t ? 'none' : '1px solid #e5e0ea',
                }}
              />
            ))}
          </Box>

          <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 0.3 }}>AGORA</Typography>
          <Typography variant="body2" sx={{ color: '#7a7186', mb: 1.5 }}>
            O que precisa de atenção agora.
          </Typography>

          {PLANO_ITEMS.map((item, i) => (
            <Card key={i} sx={{ borderRadius: 4, p: 2, mb: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ display: 'flex', gap: 1.2 }}>
                  {item.icon}
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ color: '#7a7186' }}>{item.when}</Typography>
                  </Box>
                </Box>
                <ChevronRightIcon sx={{ color: '#c9c2d1' }} />
              </Box>
              <Typography variant="caption" sx={{ color: '#b3aebb', display: 'block', mt: 1 }}>
                Por quê?
              </Typography>
              <Typography variant="body2" sx={{ color: '#7a7186' }}>{item.why}</Typography>
            </Card>
          ))}

          <Button
            fullWidth
            variant="contained"
            sx={{ backgroundColor: '#634879', borderRadius: 3, py: 1.3, fontWeight: 600, mt: 1, '&:hover': { backgroundColor: '#4f3a63' } }}
          >
            Ver plano completo
          </Button>
        </>
      ) : (
        <>
          <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1.5 }}>
            Exames e acompanhamento
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto' }}>
            {AGENDA_TABS.map((t) => (
              <Chip
                key={t}
                label={t}
                onClick={() => setAgendaTab(t)}
                sx={{
                  backgroundColor: agendaTab === t ? '#634879' : '#fff',
                  color: agendaTab === t ? '#fff' : '#7a7186',
                  fontWeight: 600,
                  border: agendaTab === t ? 'none' : '1px solid #e5e0ea',
                }}
              />
            ))}
          </Box>

          {AGENDA_ITEMS.map((item, i) => (
            <Card
              key={i}
              sx={{
                borderRadius: 4,
                p: 1.6,
                mb: 1.2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                {item.icon}
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ color: '#7a7186' }}>{item.when}</Typography>
                </Box>
              </Box>
              <Chip
                label={item.tag}
                size="small"
                sx={{ backgroundColor: item.tagBg, color: item.tagColor, fontWeight: 600 }}
              />
            </Card>
          ))}

          <Button
            fullWidth
            variant="contained"
            sx={{ backgroundColor: '#634879', borderRadius: 3, py: 1.3, fontWeight: 600, mt: 1, '&:hover': { backgroundColor: '#4f3a63' } }}
          >
            Solicitar novo exame
          </Button>
        </>
      )}
    </Box>
  )
}
