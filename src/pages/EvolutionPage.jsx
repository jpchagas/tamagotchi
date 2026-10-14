import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import ShowChartIcon from '@mui/icons-material/ShowChartRounded'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Page, PageHeader, Section, Segmented, RowButton, Sparkline, EmptyState } from '../components/ui'
import { TONES, changeTone } from '../components/uiHelpers'
import { colors, cardShadow } from '../theme'
import { getBiomarkersGrouped, getBiomarkerTypes } from '../services/biomarkersService'

const RANGES = [
  { value: '3M', label: '3M', months: 3 },
  { value: '6M', label: '6M', months: 6 },
  { value: '1A', label: '1A', months: 12 },
  { value: 'Tudo', label: 'Tudo', months: null },
]

const formatNumber = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace('.', ','))
const shortDate = (t) => new Date(t).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '')

function inRange(readings, months) {
  if (!months) return readings
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - months)
  const filtered = readings.filter((r) => r.recordedAt >= cutoff)
  // Keep at least the last two points so there is always a trend to show.
  return filtered.length >= 2 ? filtered : readings.slice(-2)
}

// First-to-last change over the selected range (not just the last step).
function rangeChange(readings, goodDirection) {
  if (readings.length < 2) return null
  const first = readings[0].value
  const last = readings[readings.length - 1].value
  const diff = last - first
  const direction = diff < 0 ? 'down' : diff > 0 ? 'up' : 'flat'
  return {
    direction,
    percent: first !== 0 ? (diff / first) * 100 : 0,
    improving: !goodDirection || direction === 'flat' ? null : direction === goodDirection,
  }
}

function trendText(change) {
  if (!change) return 'Uma medição até agora'
  if (change.direction === 'flat') return 'Estável'
  const pct = Math.abs(Math.round(change.percent))
  const verdict = change.improving === null ? '' : change.improving ? ' · melhorou' : ' · piorou'
  return `${change.direction === 'down' ? '↓' : '↑'} ${pct || '<1'}%${verdict}`
}

function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) return null
  const { t, v } = payload[0].payload
  return (
    <Box sx={{ backgroundColor: colors.ink, color: '#FFFFFF', px: 1.25, py: 0.75, borderRadius: '10px', fontSize: '0.8125rem' }}>
      <b>{formatNumber(v)} {unit}</b>
      <Box sx={{ opacity: 0.75, fontSize: '0.75rem' }}>{new Date(t).toLocaleDateString('pt-BR')}</Box>
    </Box>
  )
}

export default function EvolutionPage({ uid, initialFocus }) {
  const [range, setRange] = useState('1A')
  const [biomarkers, setBiomarkers] = useState(null)
  const [focus, setFocus] = useState(initialFocus)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    Promise.all([getBiomarkersGrouped(uid), getBiomarkerTypes()])
      .then(([grouped, types]) => {
        if (cancelled) return
        const list = Object.entries(grouped)
          .map(([key, readings]) => ({
            key,
            readings,
            label: types[key]?.label || key,
            unit: types[key]?.unit || readings[readings.length - 1]?.unit || '',
            goodDirection: types[key]?.goodDirection,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
        setBiomarkers(list)
      })
      .catch(() => !cancelled && setError('Não foi possível carregar seus indicadores.'))
    return () => {
      cancelled = true
    }
  }, [uid])

  const months = RANGES.find((r) => r.value === range).months
  const rows = (biomarkers || []).map((b) => {
    const readings = inRange(b.readings, months)
    return { ...b, readings, change: rangeChange(readings, b.goodDirection) }
  })
  const focused = rows.find((r) => r.key === focus) || rows[0]
  const focusedTone = TONES[changeTone(focused?.change)]
  const chartData = focused ? focused.readings.map((r) => ({ t: r.recordedAt.getTime(), v: r.value })) : []

  return (
    <Page>
      <PageHeader title="Evolução" subtitle="Seus indicadores ao longo do tempo." />
      <Segmented label="Período" options={RANGES} value={range} onChange={setRange} />

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}
      {!biomarkers && !error && <Skeleton variant="rounded" height={260} sx={{ borderRadius: '22px' }} />}

      {biomarkers && biomarkers.length === 0 && (
        <EmptyState icon={<ShowChartIcon />} title="Nenhum indicador ainda">
          Eles aparecem aqui quando você envia resultados de exames.
        </EmptyState>
      )}

      {focused && (
        <Box sx={{ backgroundColor: colors.surface, borderRadius: '22px', boxShadow: cardShadow, p: 2, pb: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: colors.muted }}>{focused.label}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '2.125rem', fontWeight: 800, letterSpacing: '-0.8px' }}>
              {formatNumber(focused.readings[focused.readings.length - 1].value)}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: colors.muted }}>{focused.unit}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: focusedTone.color, ml: 'auto' }}>{trendText(focused.change)}</Typography>
          </Box>
          <Box sx={{ height: 170, mt: 1, ml: -1 }} role="img" aria-label={`${focused.label}: ${chartData.map((d) => formatNumber(d.v)).join(', ')} ${focused.unit}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="evolutionFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.brand} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={colors.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={colors.line} />
                <XAxis dataKey="t" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={shortDate} tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: colors.muted }} axisLine={false} tickLine={false} width={36} tickFormatter={formatNumber} />
                <Tooltip content={<ChartTooltip unit={focused.unit} />} cursor={{ stroke: colors.lineStrong }} />
                <Area type="monotone" dataKey="v" stroke={colors.brand} strokeWidth={2.5} fill="url(#evolutionFill)" dot={{ r: 3, fill: colors.brand, strokeWidth: 0 }} activeDot={{ r: 5 }} animationDuration={500} />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}

      {rows.length > 0 && (
        <Section padded={false}>
          {rows.map((row) => {
            const tone = TONES[changeTone(row.change)]
            const on = row.key === focused?.key
            return (
              <RowButton key={row.key} onClick={() => setFocus(row.key)} sx={{ backgroundColor: on ? colors.brandTint : 'transparent', '&:hover': { backgroundColor: on ? colors.brandTint : colors.ground } }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }} aria-current={on ? 'true' : undefined}>
                  <Typography variant="subtitle1" noWrap>{row.label}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: tone.color }}>{trendText(row.change)}</Typography>
                </Box>
                <Sparkline values={row.readings.map((r) => r.value)} width={64} height={24} color={tone.color} />
                <Typography sx={{ fontWeight: 800, minWidth: 72, textAlign: 'right' }}>
                  {formatNumber(row.readings[row.readings.length - 1].value)}
                  <Box component="span" sx={{ fontSize: '0.6875rem', fontWeight: 600, color: colors.muted }}> {row.unit}</Box>
                </Typography>
              </RowButton>
            )
          })}
        </Section>
      )}
    </Page>
  )
}
