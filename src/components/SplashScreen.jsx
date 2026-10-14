import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import logo from '../assets/logo.png'
import { colors } from '../theme'

// Shown only while Firebase resolves the session — no fixed delay.
export default function SplashScreen() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: colors.brandTint }}>
      <Box component="img" src={logo} alt="" sx={{ width: 88, height: 88, borderRadius: '28px', boxShadow: '0 12px 28px rgba(99,72,121,0.3)' }} />
      <Typography variant="h5" component="h1">Tamagotchi</Typography>
      <CircularProgress size={22} sx={{ color: colors.brand, mt: 1 }} aria-label="Carregando" />
    </Box>
  )
}
