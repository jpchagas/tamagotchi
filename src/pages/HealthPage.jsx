import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
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
import BloodtypeIcon from '@mui/icons-material/Bloodtype'
import { getBiomarkersGrouped, getBiomarkerTypes, computeChange } from '../services/biomarkersService'
import { getLatestRisks, riskTypeLabel, formatRiskValue, RISK_CATEGORIES } from '../services/risksService'
import { getConducts, getNextPendingConduct, formatRelativeDate } from '../services/conductsService'

const RISK_ICONS = {
  cardiovascular: FavoriteIcon,
  diabetes: BloodtypeIcon,
  metabolico: SpaIcon,
  oncologico: CoronavirusIcon,
  cerebral: PsychologyIcon,
}

const NEUTRAL_COLOR = '#7a7186'

// "O que mudou": the biomarkers whose latest reading is most recent,
// among those with at least two readings to compare.
const CHANGE_TILE_COUNT = 3

function recentChanges(readingsByType, biomarkerTypes) {
  return Object.entries(readingsByType)
    .map(([key, readings]) => {
      const type = biomarkerTypes[key]
      const change = computeChange(readings, type?.goodDirection)
      return change && { key, label: type?.label || key, change }
    })
    .filter(Boolean)
    .sort((a, b) => b.change.latest.recordedAt - a.change.latest.recordedAt)
    .slice(0, CHANGE_TILE_COUNT)
}

function attentionSummary(risks) {
  if (risks.length === 0) return { text: 'Nenhum risco calculado ainda.', color: NEUTRAL_COLOR }
  const high = risks.filter((r) => r.category === 'alto').length
  if (high === 0) return { text: 'Nenhuma área exige atenção agora', color: '#3ba55c' }
  return { text: `${high} ${high > 1 ? 'áreas precisam' : 'área precisa'} da sua atenção`, color: '#d64545' }
}

export default function HealthPage({ userName = 'Paciente', uid, onOpenRisk, onLogout, pendingRequestsCount = 0 }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) return
    let cancelled = false

    Promise.all([getLatestRisks(uid), getBiomarkersGrouped(uid), getBiomarkerTypes(), getConducts(uid)])
      .then(([risks, readingsByType, biomarkerTypes, conducts]) => {
        if (cancelled) return
        setData({
          risks,
          changes: recentChanges(readingsByType, biomarkerTypes),
          nextConduct: getNextPendingConduct(conducts),
        })
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar seus dados de saúde.')
      })

    return () => {
      cancelled = true
    }
  }, [uid])

  const loading = !data && !error
  const summary = data ? attentionSummary(data.risks) : null

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
          <Badge badgeContent={pendingRequestsCount} color="error" max={9}>
            <NotificationsNoneIcon sx={{ color: '#2b2338' }} />
          </Badge>
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

        {error && (
          <Typography variant="body2" sx={{ color: '#d64545', mb: 1 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          [0, 1, 2].map((i) => <Skeleton key={i} variant="text" sx={{ height: 40 }} />)
        ) : (
          summary && (
            <Typography variant="body2" sx={{ color: summary.color, fontWeight: 600, mb: 1.5 }}>
              {summary.text}
            </Typography>
          )
        )}

        {data?.risks.map((risk) => {
          const Icon = RISK_ICONS[risk.riskType] || FavoriteIcon
          const color = RISK_CATEGORIES[risk.category]?.color || NEUTRAL_COLOR
          return (
            <Box
              key={risk.id}
              onClick={() => onOpenRisk?.(risk.riskType)}
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
                <Icon sx={{ color }} />
                <Typography sx={{ color: '#2b2338', fontWeight: 500 }}>
                  {riskTypeLabel(risk.riskType)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="body2" sx={{ color, fontWeight: 600 }}>
                  {formatRiskValue(risk)}
                </Typography>
                <ChevronRightIcon sx={{ color: '#c9c2d1', fontSize: 18 }} />
              </Box>
            </Box>
          )
        })}
      </Card>

      {/* O que mudou */}
      <Card sx={{ borderRadius: 4, p: 2, mb: 2 }}>
        <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1.5 }}>
          O que mudou
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" sx={{ flex: 1, height: 64, borderRadius: 3 }} />
            ))}
          </Box>
        ) : data && data.changes.length === 0 ? (
          <Typography variant="body2" sx={{ color: NEUTRAL_COLOR }}>
            Ainda não há duas medições de um mesmo indicador para comparar.
          </Typography>
        ) : (
          data && (
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              {data.changes.map(({ key, label, change }) => (
                <MetricTile key={key} label={label} change={change} />
              ))}
            </Box>
          )
        )}
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
          {loading ? (
            <Skeleton variant="text" sx={{ width: 180 }} />
          ) : data?.nextConduct ? (
            <>
              <Typography sx={{ color: '#2b2338', fontWeight: 600 }}>
                {data.nextConduct.title}
              </Typography>
              <Typography variant="body2" sx={{ color: NEUTRAL_COLOR }}>
                {formatRelativeDate(data.nextConduct.dueDate)}
              </Typography>
            </>
          ) : (
            <Typography sx={{ color: '#2b2338', fontWeight: 600 }}>
              Nenhuma ação pendente
            </Typography>
          )}
        </Box>
      </Card>
    </Box>
  )
}

// Green when the change is an improvement, red when it's a worsening,
// neutral when the biomarker type doesn't say which way is better.
function MetricTile({ label, change }) {
  const flat = change.direction === 'flat'
  const color = change.improving === null ? NEUTRAL_COLOR : change.improving ? '#3ba55c' : '#d64545'
  const Arrow = change.direction === 'down' ? ArrowDownwardIcon : ArrowUpwardIcon
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
      <Typography variant="caption" sx={{ color: NEUTRAL_COLOR }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3 }}>
        {!flat && <Arrow sx={{ fontSize: 14, color }} />}
        <Typography sx={{ fontWeight: 700, color: flat ? NEUTRAL_COLOR : color }}>
          {flat ? 'Estável' : `${Math.abs(Math.round(change.percent))}%`}
        </Typography>
      </Box>
    </Box>
  )
}
