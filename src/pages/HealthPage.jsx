import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import Skeleton from '@mui/material/Skeleton'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import LogoutIcon from '@mui/icons-material/Logout'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import FavoriteIcon from '@mui/icons-material/Favorite'
import PsychologyIcon from '@mui/icons-material/Psychology'
import CoronavirusIcon from '@mui/icons-material/Coronavirus'
import SpaIcon from '@mui/icons-material/Spa'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import { getAllMetricReadingsGrouped, getLatestAndPrevious } from '../services/metricsService'

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

// Metrics shown in "O que mudou", in display order, with formatting rules.
const CHANGE_METRICS = [
  { key: 'apob', label: 'ApoB', mode: 'percent' },
  { key: 'gorduraVisceral', label: 'Gordura visceral', mode: 'percent' },
  { key: 'hba1c', label: 'HbA1c', mode: 'stable' },
]

function computeChange(readings) {
  const { latest, previous } = getLatestAndPrevious(readings)
  if (!latest || !previous) return null
  const diff = latest.value - previous.value
  const percent = previous.value !== 0 ? (diff / previous.value) * 100 : 0
  return { diff, percent, direction: diff < 0 ? 'down' : diff > 0 ? 'up' : 'flat' }
}

export default function HealthPage({ userName = 'Paciente', uid, onOpenCondition, onLogout }) {
  const [readingsByMetric, setReadingsByMetric] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) return
    let cancelled = false

    getAllMetricReadingsGrouped(uid)
      .then((grouped) => {
        if (!cancelled) setReadingsByMetric(grouped)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar seus dados de saúde.')
      })

    return () => {
      cancelled = true
    }
  }, [uid])

  const sonoChange = readingsByMetric ? computeChange(readingsByMetric.sono) : null

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
        <IconButton onClick={onLogout} aria-label="Sair">
          <LogoutIcon sx={{ color: '#2b2338' }} />
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

        {error && (
          <Typography variant="body2" sx={{ color: '#d64545', mb: 1 }}>
            {error}
          </Typography>
        )}

        {!readingsByMetric && !error ? (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" sx={{ flex: 1, height: 64, borderRadius: 3 }} />
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
            {CHANGE_METRICS.map((m) => {
              const change = readingsByMetric ? computeChange(readingsByMetric[m.key]) : null
              if (!change) {
                return <MetricTile key={m.key} label={m.label} value="—" flat />
              }
              if (m.mode === 'stable' && change.direction === 'flat') {
                return <MetricTile key={m.key} label={m.label} value="Estável" flat />
              }
              const displayValue = `${Math.abs(Math.round(change.percent))}%`
              return (
                <MetricTile
                  key={m.key}
                  label={m.label}
                  value={displayValue}
                  direction={change.direction}
                />
              )
            })}
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" sx={{ color: '#7a7186' }}>Sono</Typography>
          {sonoChange ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              {sonoChange.direction === 'down' ? (
                <ArrowDownwardIcon sx={{ fontSize: 14, color: '#3ba55c' }} />
              ) : (
                <ArrowUpwardIcon sx={{ fontSize: 14, color: '#3ba55c' }} />
              )}
              <Typography variant="body2" sx={{ color: '#3ba55c', fontWeight: 600 }}>
                {Math.abs(Math.round(sonoChange.diff))} min/noite
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: '#b3aebb' }}>—</Typography>
          )}
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

function MetricTile({ label, value, direction, flat }) {
  const isDown = direction === 'down'
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
        {!flat && (isDown ? (
          <ArrowDownwardIcon sx={{ fontSize: 14, color: '#3ba55c' }} />
        ) : (
          <ArrowUpwardIcon sx={{ fontSize: 14, color: '#3ba55c' }} />
        ))}
        <Typography sx={{ fontWeight: 700, color: '#3ba55c' }}>{value}</Typography>
      </Box>
    </Box>
  )
}
