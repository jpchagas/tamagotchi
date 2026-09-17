import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AlarmIcon from '@mui/icons-material/Alarm'
import MedicationIcon from '@mui/icons-material/Medication'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import ScienceIcon from '@mui/icons-material/Science'
import EventIcon from '@mui/icons-material/Event'
import VaccinesIcon from '@mui/icons-material/Vaccines'
import BloodtypeIcon from '@mui/icons-material/Bloodtype'
import { getConducts, groupByTimeframe, formatRelativeDate as conductRelativeDate } from '../services/conductsService'
import { getExams, groupByStatus, formatRelativeDate as examRelativeDate } from '../services/examsService'

const PLANO_TABS = [
  { key: 'agora', label: 'Agora' },
  { key: 'proximos90', label: 'Próximos 90 dias' },
  { key: 'esteAno', label: 'Este ano' },
  { key: 'longoPrazo', label: 'Longo prazo' },
]

const AGENDA_TABS = [
  { key: 'solicitado', label: 'Solicitados' },
  { key: 'em_andamento', label: 'Em andamento' },
  { key: 'realizado', label: 'Realizados' },
]

const CONDUCT_ICONS = {
  medication: <MedicationIcon sx={{ color: '#634879' }} />,
  diet: <RestaurantIcon sx={{ color: '#634879' }} />,
  exercise: <DirectionsRunIcon sx={{ color: '#634879' }} />,
  followup: <EventRepeatIcon sx={{ color: '#634879' }} />,
}

const EXAM_ICONS = {
  lab: <ScienceIcon sx={{ color: '#634879' }} />,
  imaging: <EventIcon sx={{ color: '#634879' }} />,
  vaccine: <VaccinesIcon sx={{ color: '#634879' }} />,
  blood: <BloodtypeIcon sx={{ color: '#634879' }} />,
}

const PRIORITY_STYLE = {
  prioritario: { label: 'Prioritário', color: '#d64545', bg: '#fdeceb' },
  rotina: { label: 'Rotina', color: '#3ba55c', bg: '#e6f5ea' },
}

export default function PlanPage({ uid }) {
  const [view, setView] = useState('plano') // 'plano' | 'agenda'
  const [planoTab, setPlanoTab] = useState('agora')
  const [agendaTab, setAgendaTab] = useState('solicitado')

  const [conducts, setConducts] = useState(null)
  const [exams, setExams] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) {
      setError('Usuário não identificado.')
      return
    }
    let cancelled = false

    Promise.all([getConducts(uid), getExams(uid)])
      .then(([conductList, examList]) => {
        if (cancelled) return
        setConducts(groupByTimeframe(conductList))
        setExams(groupByStatus(examList))
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar seu plano.')
      })

    return () => {
      cancelled = true
    }
  }, [uid])

  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Button
          onClick={() => setView('plano')}
          sx={{
            flex: 1, borderRadius: 3, textTransform: 'none', fontWeight: 700,
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
            flex: 1, borderRadius: 3, textTransform: 'none', fontWeight: 700,
            backgroundColor: view === 'agenda' ? '#634879' : '#fff',
            color: view === 'agenda' ? '#fff' : '#7a7186',
            '&:hover': { backgroundColor: view === 'agenda' ? '#634879' : '#f0eef3' },
          }}
        >
          Agenda
        </Button>
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: '#d64545', mb: 2 }}>
          {error}
        </Typography>
      )}

      {view === 'plano' ? (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, overflowX: 'auto' }}>
            {PLANO_TABS.map((t) => (
              <Chip
                key={t.key}
                label={t.label}
                onClick={() => setPlanoTab(t.key)}
                sx={{
                  backgroundColor: planoTab === t.key ? '#634879' : '#fff',
                  color: planoTab === t.key ? '#fff' : '#7a7186',
                  fontWeight: 600,
                  border: planoTab === t.key ? 'none' : '1px solid #e5e0ea',
                }}
              />
            ))}
          </Box>

          {!conducts && !error ? (
            [0, 1].map((i) => <Skeleton key={i} variant="rounded" sx={{ height: 100, borderRadius: 4, mb: 1.5 }} />)
          ) : conducts && conducts[planoTab].length === 0 ? (
            <Typography variant="body2" sx={{ color: '#7a7186' }}>
              Nada por aqui no momento.
            </Typography>
          ) : (
            conducts &&
            conducts[planoTab].map((item) => (
              <Card key={item.id} sx={{ borderRadius: 4, p: 2, mb: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', gap: 1.2 }}>
                    {CONDUCT_ICONS[item.type] || <AlarmIcon sx={{ color: '#634879' }} />}
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{item.title}</Typography>
                      <Typography variant="body2" sx={{ color: '#7a7186' }}>
                        {conductRelativeDate(item.dueDate)}
                      </Typography>
                    </Box>
                  </Box>
                  <ChevronRightIcon sx={{ color: '#c9c2d1' }} />
                </Box>
                {item.why && (
                  <>
                    <Typography variant="caption" sx={{ color: '#b3aebb', display: 'block', mt: 1 }}>
                      Por quê?
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#7a7186' }}>{item.why}</Typography>
                  </>
                )}
              </Card>
            ))
          )}

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
                key={t.key}
                label={t.label}
                onClick={() => setAgendaTab(t.key)}
                sx={{
                  backgroundColor: agendaTab === t.key ? '#634879' : '#fff',
                  color: agendaTab === t.key ? '#fff' : '#7a7186',
                  fontWeight: 600,
                  border: agendaTab === t.key ? 'none' : '1px solid #e5e0ea',
                }}
              />
            ))}
          </Box>

          {!exams && !error ? (
            [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" sx={{ height: 64, borderRadius: 4, mb: 1.2 }} />)
          ) : exams && exams[agendaTab].length === 0 ? (
            <Typography variant="body2" sx={{ color: '#7a7186' }}>
              Nenhum exame nesta categoria.
            </Typography>
          ) : (
            exams &&
            exams[agendaTab].map((item) => {
              const priority = PRIORITY_STYLE[item.priority] || PRIORITY_STYLE.rotina
              return (
                <Card
                  key={item.id}
                  sx={{ borderRadius: 4, p: 1.6, mb: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    {EXAM_ICONS[item.icon] || <ScienceIcon sx={{ color: '#634879' }} />}
                    <Box>
                      <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{item.title}</Typography>
                      <Typography variant="body2" sx={{ color: '#7a7186' }}>
                        {examRelativeDate(item.scheduledDate)}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label={priority.label} size="small" sx={{ backgroundColor: priority.bg, color: priority.color, fontWeight: 600 }} />
                </Card>
              )
            })
          )}

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
