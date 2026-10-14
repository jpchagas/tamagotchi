import { createTheme } from '@mui/material/styles'

// Design tokens for the whole app ("soft clinical": light lavender ground,
// white cards, brand purple only for actions and selection). Status colors
// differ in lightness as well as hue, so they stay distinguishable without
// color vision; always pair them with a text label.
export const colors = {
  ground: '#F6F3F9',
  surface: '#FFFFFF',
  ink: '#241C30',
  muted: '#645A70',
  subtle: '#8C8297',
  line: '#ECE7F1',
  lineStrong: '#DCD5E3',
  brand: '#634879',
  brandDark: '#4F3A63',
  brandTint: '#F0E9F7',
  segment: '#F1ECF5',
  good: '#1E7A55',
  goodBg: '#E5F4EC',
  warn: '#9A5A07',
  warnBg: '#FBF0DF',
  alert: '#B3261E',
  alertBg: '#FCE8E6',
  info: '#2F5A8A',
  infoBg: '#E7EEF8',
}

export const cardShadow = '0 1px 2px rgba(36,28,48,0.04), 0 8px 24px rgba(36,28,48,0.05)'

// The app is a single phone-width column, centered on larger screens.
export const APP_MAX_WIDTH = 520

const theme = createTheme({
  palette: {
    primary: { main: colors.brand, dark: colors.brandDark, contrastText: '#FFFFFF' },
    background: { default: colors.ground, paper: colors.surface },
    text: { primary: colors.ink, secondary: colors.muted },
    error: { main: colors.alert },
    success: { main: colors.good },
    warning: { main: colors.warn },
    divider: colors.line,
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
    h4: { fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.4px', lineHeight: 1.25 },
    h5: { fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.3px' },
    h6: { fontSize: '1rem', fontWeight: 700 },
    subtitle1: { fontSize: '0.9375rem', fontWeight: 700 },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.875rem' },
    caption: { fontSize: '0.75rem' },
    overline: { fontSize: '0.6875rem', fontWeight: 800, letterSpacing: '0.8px', lineHeight: 1.6 },
    button: { fontWeight: 700, textTransform: 'none', fontSize: '0.875rem' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: colors.ground },
        // Browsers don't let form controls inherit the font; plain
        // ButtonBase elements (tabs, chips, links) would fall back to Arial.
        'button, input, textarea, select': { fontFamily: 'inherit' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 14, minHeight: 44, paddingInline: 16 },
        sizeLarge: { minHeight: 54, fontSize: '1rem', borderRadius: 16 },
        outlined: { borderColor: colors.lineStrong, color: colors.ink },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 22, boxShadow: cardShadow } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 14, backgroundColor: colors.surface },
        notchedOutline: { borderColor: colors.lineStrong },
      },
    },
    MuiInputLabel: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 700 } },
    },
    MuiSkeleton: {
      defaultProps: { animation: 'wave' },
    },
  },
})

export default theme
