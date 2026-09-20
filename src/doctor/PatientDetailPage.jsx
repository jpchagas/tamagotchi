import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Skeleton from '@mui/material/Skeleton'
import Button from '@mui/material/Button'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import { getUserProfile } from '../services/profileService'
import { getExams, groupByStatus, formatRelativeDate as examRelativeDate } from '../services/examsService'
import { getConducts, groupByTimeframe, formatRelativeDate as conductRelativeDate } from '../services/conductsService'
import { getAllMetricReadingsGrouped, getLatestAndPrevious, getMetricDefinitions } from '../services/metricsService'

const REVIEW_STATUS_STYLE = {
  not_reviewed: { label: 'Não revisado', color: '#e08a3c', bg: '#fdf1e6' },
  reviewed: { label: 'Revisado', color: '#3ba55c', bg: '#e6f5ea' },
}
const PRIORITY_STYLE = {
  prioritario: { label: 'Prioritário', color: '#d64545', bg: '#fdeceb' },
  rotina: { label: 'Rotina', color: '#3ba55c', bg: '#e6f5ea' },
}
const TIMEFRAME_LABELS = {
  agora: 'Agora',
  proximos90: 'Próximos 90 dias',
  esteAno: 'Este ano',
  longoPrazo: 'Longo prazo',
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  if (isNaN(dob)) return null
  const diff = Date.now() - dob.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))
}

export default function PatientDetailPage({ patientUid, patientName, onBack }) {
  const [tab, setTab] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [exams, setExams] = useState(null)
  const [conducts, setConducts] = useState(null)
  const [readingsByMetric, setReadingsByMetric] = useState(null)
  const [metricDefinitions, setMetricDefinitions] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (!patientUid) {
      setError('Paciente não identificado.')
      return
    }
    Promise.all([
      getUserProfile(patientUid),
      getExams(patientUid),
      getConducts(patientUid),
      getAllMetricReadingsGrouped(patientUid),
      getMetricDefinitions(),
    ])
      .then(([profileData, examList, conductList, readings, definitions]) => {
        setProfile(profileData)
        setExams(examList)
        setConducts(conductList)
        setReadingsByMetric(readings)
        setMetricDefinitions(Object.fromEntries(definitions.map((d) => [d.key, d])))
      })
      .catch(() => setError('Não foi possível carregar os dados deste paciente.'))
  }, [patientUid])

  const age = calculateAge(profile?.dateOfBirth)
  const pendingReviewCount = (exams || []).filter((e) => e.reviewStatus === 'not_reviewed').length
  const activeConductCount = (conducts || []).filter((c) => c.status !== 'done').length
  const recentExams = exams ? [...exams].slice(-3).reverse() : []
  const upcomingConducts = conducts ? [...conducts].filter((c) => c.status !== 'done').slice(0, 3) : []

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f7f5fa' }}>
      <Box sx={{ p: 2, pb: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <IconButton onClick={onBack} sx={{ mr: 0.5, ml: -1 }}>
            <ArrowBackIcon sx={{ color: '#2b2338' }} />
          </IconButton>
          <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>
            Detalhe do paciente
          </Typography>
        </Box>

        <Card sx={{ borderRadius: 4, p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 52, height: 52 }}>👤</Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>
              {profile?.fullName || patientName}
            </Typography>
            <Typography variant="body2" sx={{ color: '#7a7186' }}>
              {[age ? `${age} anos` : null, profile?.sexAssignedAtBirth].filter(Boolean).join(' · ')}
            </Typography>
          </Box>
          {pendingReviewCount > 0 && (
            <Chip label={`${pendingReviewCount} pendente${pendingReviewCount > 1 ? 's' : ''}`} size="small" sx={{ backgroundColor: '#fdf1e6', color: '#e08a3c', fontWeight: 600 }} />
          )}
        </Card>

        {error && (
          <Typography variant="body2" sx={{ color: '#d64545', mb: 2 }}>
            {error}
          </Typography>
        )}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons={false}
          sx={{
            mb: 2, minHeight: 0,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, color: '#7a7186', minHeight: 0, py: 1 },
            '& .Mui-selected': { color: '#634879 !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#634879' },
          }}
        >
          <Tab value="overview" label="Visão geral" />
          <Tab value="exams" label="Exames" />
          <Tab value="conducts" label="Condutas" />
          <Tab value="history" label="Histórico" />
        </Tabs>
      </Box>

      <Box sx={{ p: 2, pt: 0, pb: 6 }}>
        {!profile && !error && (
          <>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" sx={{ height: 80, borderRadius: 4, mb: 1.5 }} />
            ))}
          </>
        )}

        {profile && tab === 'overview' && (
          <>
            <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1 }}>Últimos exames</Typography>
            {recentExams.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#7a7186', mb: 2 }}>Nenhum exame registrado.</Typography>
            ) : (
              recentExams.map((e) => (
                <Card key={e.id} sx={{ borderRadius: 3, p: 1.6, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{e.title}</Typography>
                    <Typography variant="body2" sx={{ color: '#7a7186' }}>{examRelativeDate(e.scheduledDate)}</Typography>
                  </Box>
                  {e.reviewStatus && (
                    <Chip label={REVIEW_STATUS_STYLE[e.reviewStatus].label} size="small" sx={{ backgroundColor: REVIEW_STATUS_STYLE[e.reviewStatus].bg, color: REVIEW_STATUS_STYLE[e.reviewStatus].color, fontWeight: 600 }} />
                  )}
                </Card>
              ))
            )}

            <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1, mt: 2 }}>Próximas ações</Typography>
            {upcomingConducts.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#7a7186' }}>Nenhuma conduta ativa.</Typography>
            ) : (
              upcomingConducts.map((c) => (
                <Card key={c.id} sx={{ borderRadius: 3, p: 1.6, mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{c.title}</Typography>
                  <Typography variant="body2" sx={{ color: '#7a7186' }}>{conductRelativeDate(c.dueDate)}</Typography>
                </Card>
              ))
            )}
          </>
        )}

        {profile && tab === 'exams' && (
          <ExamsTab exams={exams} />
        )}

        {profile && tab === 'conducts' && (
          <ConductsTab conducts={conducts} />
        )}

        {profile && tab === 'history' && (
          <HistoryTab readingsByMetric={readingsByMetric} metricDefinitions={metricDefinitions} />
        )}
      </Box>
    </Box>
  )
}

function ExamsTab({ exams }) {
  const grouped = groupByStatus(exams || [])
  const sections = [
    ['solicitado', 'Solicitados'],
    ['em_andamento', 'Em andamento'],
    ['realizado', 'Realizados'],
  ]

  return (
    <>
      {sections.map(([key, label]) => (
        <Box key={key} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700 }}>
            {label.toUpperCase()} ({grouped[key].length})
          </Typography>
          {grouped[key].map((e) => {
            const priority = PRIORITY_STYLE[e.priority] || PRIORITY_STYLE.rotina
            return (
              <Card key={e.id} sx={{ borderRadius: 3, p: 1.6, mt: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{e.title}</Typography>
                    <Typography variant="body2" sx={{ color: '#7a7186' }}>{examRelativeDate(e.scheduledDate)}</Typography>
                  </Box>
                  <Chip
                    label={e.reviewStatus ? REVIEW_STATUS_STYLE[e.reviewStatus].label : priority.label}
                    size="small"
                    sx={{
                      backgroundColor: e.reviewStatus ? REVIEW_STATUS_STYLE[e.reviewStatus].bg : priority.bg,
                      color: e.reviewStatus ? REVIEW_STATUS_STYLE[e.reviewStatus].color : priority.color,
                      fontWeight: 600,
                    }}
                  />
                </Box>
                {e.attachmentUrl && (
                  <Button
                    href={e.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<DescriptionOutlinedIcon />}
                    size="small"
                    sx={{ mt: 1, color: '#634879', textTransform: 'none', p: 0, minWidth: 0 }}
                  >
                    Ver arquivo
                  </Button>
                )}
              </Card>
            )
          })}
        </Box>
      ))}
    </>
  )
}

function ConductsTab({ conducts }) {
  const grouped = groupByTimeframe(conducts || [])
  return (
    <>
      {Object.entries(TIMEFRAME_LABELS).map(([key, label]) => (
        <Box key={key} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700 }}>
            {label.toUpperCase()} ({grouped[key].length})
          </Typography>
          {grouped[key].map((c) => (
            <Card key={c.id} sx={{ borderRadius: 3, p: 1.6, mt: 1 }}>
              <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{c.title}</Typography>
              <Typography variant="body2" sx={{ color: '#7a7186' }}>{conductRelativeDate(c.dueDate)}</Typography>
              {c.why && <Typography variant="body2" sx={{ color: '#7a7186', mt: 0.5 }}>{c.why}</Typography>}
              {c.attachmentUrl && (
                <Button
                  href={c.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<DescriptionOutlinedIcon />}
                  size="small"
                  sx={{ mt: 1, color: '#634879', textTransform: 'none', p: 0, minWidth: 0 }}
                >
                  Ver receita
                </Button>
              )}
            </Card>
          ))}
        </Box>
      ))}
    </>
  )
}

function HistoryTab({ readingsByMetric, metricDefinitions }) {
  const metricKeys = Object.keys(readingsByMetric || {})
  if (metricKeys.length === 0) {
    return <Typography variant="body2" sx={{ color: '#7a7186' }}>Nenhum indicador registrado ainda.</Typography>
  }

  return (
    <>
      {metricKeys.map((key) => {
        const { latest, previous } = getLatestAndPrevious(readingsByMetric[key])
        if (!latest) return null
        const diff = previous ? latest.value - previous.value : 0
        const def = metricDefinitions[key]
        return (
          <Card key={key} sx={{ borderRadius: 3, p: 1.6, mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{def?.label || key}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {previous && diff !== 0 && (
                diff < 0
                  ? <ArrowDownwardIcon sx={{ fontSize: 14, color: '#3ba55c' }} />
                  : <ArrowUpwardIcon sx={{ fontSize: 14, color: '#e08a3c' }} />
              )}
              <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>
                {latest.value}{def?.unit ? ` ${def.unit}` : ''}
              </Typography>
            </Box>
          </Card>
        )
      })}
    </>
  )
}
