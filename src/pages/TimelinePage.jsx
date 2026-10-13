import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { getBiomarkersGrouped, getBiomarkerTypes } from '../services/biomarkersService'

const RANGES = ['3M', '6M', '1A', '2A', 'Tudo']
const RANGE_MONTHS = { '3M': 3, '6M': 6, '1A': 12, '2A': 24, Tudo: null }


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
  // Types created by the extraction have no goodDirection: show the
  // direction without calling it better or worse.
  if (!goodDirection) return { label: last > first ? 'Subindo' : 'Descendo', color: '#5b6b8c', bg: '#e8ecf5' }
  const improving = goodDirection === 'down' ? last < first : last > first
  return improving
    ? { label: 'Melhorando', color: '#3ba55c', bg: '#e6f5ea' }
    : { label: 'Piorando', color: '#d64545', bg: '#fdeceb' }
}

export default function TimelinePage({ uid }) {
  const [range, setRange] = useState('2A')
  const [biomarkers, setBiomarkers] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) {
      setError('Usuário não identificado.')
      return
    }
    let cancelled = false

    Promise.all([getBiomarkersGrouped(uid), getBiomarkerTypes()])
      .then(([grouped, types]) => {
        if (cancelled) return
        // Every biomarker the patient has, in alphabetical order of label.
        const list = Object.entries(grouped)
          .map(([key, readings]) => ({ key, readings, label: types[key]?.label || key, unit: types[key]?.unit || readings[0]?.unit || '', goodDirection: types[key]?.goodDirection }))
          .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
        setBiomarkers(list)
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

      {biomarkers && biomarkers.length === 0 && (
        <Typography variant="body2" sx={{ color: '#7a7186' }}>
          Nenhum indicador registrado ainda. Eles aparecem aqui quando você envia resultados de exames.
        </Typography>
      )}

      {!biomarkers && !error
        ? [0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ height: 120, borderRadius: 4, mb: 2 }} />
          ))
        : biomarkers &&
          biomarkers.map((m) => {
            const readings = filterByRange(m.readings, range)
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
