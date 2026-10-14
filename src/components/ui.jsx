// Shared building blocks for every screen, so patient and doctor screens
// look and behave the same. Colors come from the tokens in src/theme.js.
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import SwipeableDrawer from '@mui/material/SwipeableDrawer'
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded'
import CloseIcon from '@mui/icons-material/CloseRounded'
import FavoriteIcon from '@mui/icons-material/FavoriteBorderRounded'
import WaterDropIcon from '@mui/icons-material/WaterDropOutlined'
import SpaIcon from '@mui/icons-material/SpaOutlined'
import PsychologyIcon from '@mui/icons-material/PsychologyOutlined'
import FlareIcon from '@mui/icons-material/FlareRounded'
import { colors, cardShadow, APP_MAX_WIDTH } from '../theme'
import { initialsOf, TONES } from './uiHelpers'

// --- People -----------------------------------------------------------------

const AVATAR_TONES = [
  [colors.brandTint, colors.brand],
  [colors.infoBg, colors.info],
  [colors.goodBg, colors.good],
  [colors.warnBg, colors.warn],
]

// Same name, same color, on every screen.
export function PersonAvatar({ name, size = 44, solid = false, sx }) {
  const hash = [...(name || '')].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const [bg, fg] = solid ? [colors.brand, '#FFFFFF'] : AVATAR_TONES[hash % AVATAR_TONES.length]
  return (
    <Box
      aria-hidden="true"
      sx={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        backgroundColor: bg, color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: size * 0.34,
        ...sx,
      }}
    >
      {initialsOf(name)}
    </Box>
  )
}

// --- Status -----------------------------------------------------------------

export function Pill({ tone = 'neutral', children, sx }) {
  const t = TONES[tone] || TONES.neutral
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5, flexShrink: 0,
        px: 1.25, py: 0.5, borderRadius: 999,
        fontSize: '0.75rem', fontWeight: 700, lineHeight: 1.3,
        color: t.color, backgroundColor: t.bg,
        ...sx,
      }}
    >
      {children}
    </Box>
  )
}

const RISK_ICON_COMPONENTS = {
  cardiovascular: FavoriteIcon,
  diabetes: WaterDropIcon,
  metabolico: SpaIcon,
  oncologico: FlareIcon,
  cerebral: PsychologyIcon,
}

export function RiskIcon({ riskType, tone = 'neutral', size = 36 }) {
  const Icon = RISK_ICON_COMPONENTS[riskType] || FavoriteIcon
  const t = TONES[tone] || TONES.neutral
  return (
    <Box sx={{ width: size, height: size, borderRadius: 3, backgroundColor: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon sx={{ color: t.color, fontSize: size * 0.52 }} />
    </Box>
  )
}

// --- Layout -----------------------------------------------------------------

// Page body: phone padding, room at the bottom for the nav bar (or a
// sticky action bar).
export function Page({ children, bottomSpace = 13, sx }) {
  return (
    <Box sx={{ minHeight: '100dvh', backgroundColor: colors.ground, px: 2.5, pt: 3, pb: bottomSpace, display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
      {children}
    </Box>
  )
}

export function PageHeader({ title, subtitle, overline, onBack, backLabel = 'Voltar', actions }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {onBack && (
        <IconButton onClick={onBack} aria-label={backLabel} sx={{ alignSelf: 'flex-start', width: 44, height: 44, backgroundColor: colors.surface, border: `1px solid ${colors.line}` }}>
          {backLabel === 'Fechar' ? <CloseIcon sx={{ color: colors.ink }} /> : <ArrowBackIcon sx={{ color: colors.ink }} />}
        </IconButton>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ minWidth: 0 }}>
          {overline && <Typography variant="body2" sx={{ color: colors.muted, fontWeight: 500 }}>{overline}</Typography>}
          {title && <Typography variant="h4" component="h1">{title}</Typography>}
          {subtitle && <Typography variant="body2" sx={{ color: colors.muted, mt: 0.25 }}>{subtitle}</Typography>}
        </Box>
        {actions && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>{actions}</Box>}
      </Box>
    </Box>
  )
}

// A white card with an optional title row ("Sua saúde hoje" … "Ver tudo").
export function Section({ title, action, children, padded = true, sx }) {
  return (
    <Box sx={{ backgroundColor: colors.surface, borderRadius: '22px', boxShadow: cardShadow, p: padded ? 2 : 0.5, ...sx }}>
      {(title || action) && (
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1, px: padded ? 0 : 1.5, pt: padded ? 0 : 1.5, pb: 1 }}>
          {title && <Typography variant="h6" component="h2">{title}</Typography>}
          {action}
        </Box>
      )}
      {children}
    </Box>
  )
}

// Title above a group of cards (outside any card).
export function GroupLabel({ children, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', px: 0.5 }}>
      <Typography variant="overline" component="h2" sx={{ color: colors.muted }}>{children}</Typography>
      {action}
    </Box>
  )
}

export function TextAction({ onClick, children }) {
  return (
    <ButtonBase onClick={onClick} sx={{ fontSize: '0.8125rem', fontWeight: 700, color: colors.brand, borderRadius: 1, px: 0.5, minHeight: 32 }}>
      {children}
    </ButtonBase>
  )
}

// A full-width row inside a Section; tappable when it has onClick. Without
// it, it is a plain row, so it can hold its own buttons (e.g. "Ligar").
export function RowButton({ onClick, children, sx }) {
  const rowSx = { width: '100%', display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.25, minHeight: 56, borderRadius: '16px', textAlign: 'left', justifyContent: 'flex-start', boxSizing: 'border-box' }
  if (!onClick) {
    return <Box sx={{ ...rowSx, ...sx }}>{children}</Box>
  }
  return (
    <ButtonBase onClick={onClick} sx={{ ...rowSx, '&:hover': { backgroundColor: colors.ground }, ...sx }}>
      {children}
    </ButtonBase>
  )
}

export function EmptyState({ icon, title, children, action }) {
  return (
    <Box sx={{ textAlign: 'center', py: 4, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      {icon && <Box sx={{ width: 56, height: 56, borderRadius: '18px', backgroundColor: colors.brandTint, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 0.5, color: colors.brand }}>{icon}</Box>}
      <Typography variant="subtitle1">{title}</Typography>
      {children && <Typography variant="body2" sx={{ color: colors.muted, maxWidth: 300 }}>{children}</Typography>}
      {action && <Box sx={{ mt: 1 }}>{action}</Box>}
    </Box>
  )
}

// --- Controls ---------------------------------------------------------------

// Fixed bottom tab bar. items: [{ key, label, icon, badge }]
export function BottomNav({ items, value, onChange, label = 'Navegação principal' }) {
  return (
    <Box
      component="nav"
      aria-label={label}
      sx={{
        position: 'fixed', bottom: 0, left: 0, right: 0, mx: 'auto', maxWidth: APP_MAX_WIDTH, zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${colors.line}`,
        display: 'grid', gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        pt: 0.75, pb: 'calc(10px + env(safe-area-inset-bottom))',
      }}
    >
      {items.map((item) => {
        const active = item.key === value
        const Icon = item.icon
        return (
          <ButtonBase
            key={item.key}
            onClick={() => onChange(item.key)}
            aria-current={active ? 'page' : undefined}
            sx={{ flexDirection: 'column', gap: 0.5, py: 0.5, borderRadius: 3, color: active ? colors.brand : colors.muted, fontSize: '0.6875rem', fontWeight: active ? 700 : 600 }}
          >
            <Box sx={{ width: 56, height: 30, borderRadius: '15px', backgroundColor: active ? colors.brandTint : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 150ms' }}>
              <Badge badgeContent={item.badge || 0} color="error" max={9}>
                <Icon sx={{ fontSize: 22 }} />
              </Badge>
            </Box>
            {item.label}
          </ButtonBase>
        )
      })}
    </Box>
  )
}

// Segmented control. options: [{ value, label }]
export function Segmented({ options, value, onChange, label }) {
  return (
    <Box role="group" aria-label={label} sx={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, gap: 0.5, p: 0.5, borderRadius: '14px', backgroundColor: colors.segment }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <ButtonBase
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            sx={{ minHeight: 40, borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 700, color: on ? colors.ink : colors.muted, backgroundColor: on ? colors.surface : 'transparent', boxShadow: on ? '0 1px 3px rgba(36,28,48,0.12)' : 'none', transition: 'background-color 150ms' }}
          >
            {o.label}
          </ButtonBase>
        )
      })}
    </Box>
  )
}

// Wrapping chips; single choice (value) or multiple (values + onToggle).
export function ChoiceChips({ options, value, values, onChange, onToggle, label }) {
  const multiple = Boolean(values)
  return (
    <Box role="group" aria-label={label} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {options.map((o) => {
        const on = multiple ? values.includes(o.value) : o.value === value
        return (
          <ButtonBase
            key={o.value}
            onClick={() => (multiple ? onToggle(o.value) : onChange(o.value))}
            aria-pressed={on}
            sx={{ minHeight: 40, px: 2, borderRadius: 999, fontSize: '0.875rem', fontWeight: 700, border: `1px solid ${on ? colors.brand : colors.lineStrong}`, backgroundColor: on ? colors.brand : colors.surface, color: on ? '#FFFFFF' : colors.ink, transition: 'background-color 150ms' }}
          >
            {o.label}
          </ButtonBase>
        )
      })}
    </Box>
  )
}

export function FieldLabel({ htmlFor, children, hint }) {
  return (
    <Typography component="label" htmlFor={htmlFor} variant="body2" sx={{ display: 'block', fontWeight: 700, color: colors.muted, mb: 1 }}>
      {children}
      {hint && <Box component="span" sx={{ fontWeight: 500 }}> {hint}</Box>}
    </Typography>
  )
}

// Bottom sheet with a drag handle and a close button.
export function BottomSheet({ open, onClose, title, subtitle, children }) {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableSwipeToOpen
      slotProps={{
        paper: { sx: { maxWidth: APP_MAX_WIDTH, mx: 'auto', borderRadius: '28px 28px 0 0', maxHeight: '92dvh', px: 2.5, pt: 1.25, pb: 'calc(24px + env(safe-area-inset-bottom))' } },
      }}
    >
      <Box sx={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong, mx: 'auto', mb: 1.5 }} />
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
        <Box>
          <Typography variant="h5" component="h2">{title}</Typography>
          {subtitle && <Typography variant="body2" sx={{ color: colors.muted, mt: 0.25 }}>{subtitle}</Typography>}
        </Box>
        <IconButton onClick={onClose} aria-label="Fechar" sx={{ width: 44, height: 44, backgroundColor: colors.ground, flexShrink: 0 }}>
          <CloseIcon sx={{ color: colors.ink }} />
        </IconButton>
      </Box>
      {children}
    </SwipeableDrawer>
  )
}

// Sticky bottom bar for a page's primary action (forms).
export function ActionBar({ children }) {
  return (
    <Box sx={{ position: 'fixed', left: 0, right: 0, bottom: 0, mx: 'auto', maxWidth: APP_MAX_WIDTH, zIndex: 10, backgroundColor: colors.surface, borderTop: `1px solid ${colors.line}`, px: 2.5, pt: 1.5, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
      {children}
    </Box>
  )
}

// --- Charts -----------------------------------------------------------------

// Tiny trend line. values: numbers, oldest first.
export function Sparkline({ values, width = 86, height = 24, color = colors.brand }) {
  if (!values || values.length < 2) return <Box sx={{ width, height }} />
  const min = Math.min(...values)
  const span = Math.max(...values) - min || 1
  const pad = 3
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - 2 * pad)
      const y = pad + (1 - (v - min) / span) * (height - 2 * pad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
