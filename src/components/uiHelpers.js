// Plain helpers for src/components/ui.jsx (kept apart so that file only
// exports components).
import { colors } from '../theme'

const TITLE_PREFIXES = /^(dr|dra|enf|prof)\.?$/i

export function initialsOf(name = '') {
  const words = name.trim().split(/\s+/).filter((w) => w && !TITLE_PREFIXES.test(w))
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export const TONES = {
  good: { color: colors.good, bg: colors.goodBg },
  warn: { color: colors.warn, bg: colors.warnBg },
  alert: { color: colors.alert, bg: colors.alertBg },
  info: { color: colors.info, bg: colors.infoBg },
  brand: { color: colors.brand, bg: colors.brandTint },
  neutral: { color: colors.muted, bg: colors.segment },
}

// Tone for a biomarker change computed by biomarkersService.computeChange.
export function changeTone(change) {
  if (!change || change.improving === null) return 'neutral'
  return change.improving ? 'good' : 'warn'
}

const decimal = (v) => String(v).replace('.', ',')

// "210 mg/dL" with a decimal comma.
export function formatMeasurement(value, unit) {
  return `${decimal(value)}${unit ? ` ${unit}` : ''}`
}

// An extracted value's reference range: as printed on the report, else
// built from its limits. '' when the report had none.
export function formatRange(v) {
  if (v.refText) return v.refText
  const low = typeof v.refLow === 'number' ? decimal(v.refLow) : null
  const high = typeof v.refHigh === 'number' ? decimal(v.refHigh) : null
  if (low && high) return `${low} a ${high}`
  if (high) return `até ${high}`
  if (low) return `a partir de ${low}`
  return ''
}

export const RANGE_FLAG_LABELS = { low: 'Abaixo da referência', high: 'Acima da referência' }

// A trend alert (examsService trendAlerts): "↓ 56% em 3 exames".
export function trendLabel(trend) {
  return `${trend.direction === 'down' ? '↓' : '↑'} ${Math.abs(trend.percent)}% em ${trend.count} exames`
}

export function changeLabel(change) {
  if (!change) return ''
  if (change.direction === 'flat') return 'Estável'
  const pct = Math.abs(Math.round(change.percent))
  const arrow = change.direction === 'down' ? '↓' : '↑'
  const verdict = change.improving === null ? '' : change.improving ? ' melhorou' : ' piorou'
  return `${arrow} ${pct || '<1'}%${verdict}`
}
