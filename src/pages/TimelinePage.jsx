import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { getAllMetricReadingsGrouped } from '../services/metricsService'

const RANGES = ['3M', '6M', '1A', '2A', 'Tudo']
const RANGE_MONTHS = { '3M': 3, '6M': 6, '1A': 12, '2A': 24, Tudo: null }

// Which metrics to show here, and how to describe their trend in words.
// (Direction of "improvement" varies per metric — e.g. LDL/ApoB going down
// is good, so this stays a simple config rather than a generic rule.)
const TIMELINE_METRICS = [
  { key: 'ldl', label: 'LDL', unit: 'mg/dL', goodDirection: 'down' },
  { key: 'apob', label: 'ApoB', unit: 'mg/dL', goodDirection: 'down' },
  { key: 'hba1c', label: 'HbA1c', unit: '%', goodDirection: 'down' },
]

function filterByRange(readings, rangeLabel) {
  const months = RANGE_MONTHS[rangeLabel]
  if (!months) return readings
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  return readings.filter((r) => r.recordedAt >= cutoff)
}

function describeTrend(readings, goodDirection) {
  if (readings.length < 2) return { label: 'Sem dados suficientes', color: '#7a7186', bg: '#f0eef3' }
  const first = readings[0].value
  const last = readings[readings.length - 1].value
  if (last === first) return { label: 'Estável', color: '#5b6b8c', bg: '#e8ecf5' }
  const improving = goodDirection === 'down' ? last < first : last > first
  return improving
    ? { label: 'Melhorando', color: '#3ba55c', bg: '#e6f5ea' }
    : { label: 'Piorando', color: '#d64545', bg: '#fdeceb' }
}

export default function TimelinePage({ uid }) {
  const [range, setRange] = useState('2A')
  const [readingsByMetric, setReadingsByMetric] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) {
      setError('Usuário não identificado.')
      return
    }
    let cancelled = false

    getAllMetricReadingsGrouped(uid)
      .then((grouped) => {
        if (!cancelled) setReadingsByMetric(grouped)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar seu histórico.')
      })

    return () => {
      cancelled = true
    }
  }, [uid])

  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>
        Minha saúde em números
      </Typography>
      <Typography variant="body2" sx={{ color: '#7a7186', mb: 2 }}>
        Tendências dos seus principais indicadores.
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {RANGES.map((r) => (
          <Chip
            key={r}
            label={r}
            onClick={() => setRange(r)}
            sx={{
              backgroundColor: range === r ? '#634879' : '#fff',
              color: range === r ? '#fff' : '#7a7186',
              fontWeight: 600,
              border: range === r ? 'none' : '1px solid #e5e0ea',
            }}
          />
        ))}
      </Box>

      {error && (
        <Typography variant="body2" sx={{ color: '#d64545', mb: 2 }}>
          {error}
        </Typography>
      )}

      {!readingsByMetric && !error
        ? [0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ height: 120, borderRadius: 4, mb: 2 }} />
          ))
        : readingsByMetric &&
          TIMELINE_METRICS.map((m) => {
            const allReadings = readingsByMetric[m.key] || []
            const readings = filterByRange(allReadings, range)
            const trend = describeTrend(readings, m.goodDirection)
            const from = readings[0]?.value
            const to = readings[readings.length - 1]?.value

            return (
              <Card key={m.key} sx={{ borderRadius: 4, p: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#7a7186' }}>
                      {m.label}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#b3aebb', display: 'block' }}>
                      {m.unit}
                    </Typography>
                    <Typography sx={{ fontWeight: 700, color: '#2b2338', fontSize: '1.3rem' }}>
                      {from !== undefined ? `${from} → ${to}` : 'Sem dados'}
                    </Typography>
                  </Box>
                  <Chip
                    label={trend.label}
                    size="small"
                    sx={{ backgroundColor: trend.bg, color: trend.color, fontWeight: 600 }}
                  />
                </Box>

                {readings.length > 0 && (
                  <Box sx={{ height: 50, mt: 1 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={readings.map((r, i) => ({ i, v: r.value }))}>
                        <YAxis domain={['dataMin', 'dataMax']} hide />
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke="#634879"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#634879' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                )}
              </Card>
            )
          })}
    </Box>
  )
}
