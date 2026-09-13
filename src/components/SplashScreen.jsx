import { useEffect } from 'react'
import Box from '@mui/material/Box'
import Fade from '@mui/material/Fade'

export default function SplashScreen({ onFinish, logoSrc }) {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2000)
    return () => clearTimeout(timer)
  }, [onFinish])

  return (
    <Fade in timeout={400}>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #dcbced 0%, #b597d2 100%)',
        }}
      >
        <Box
          component="img"
          src={logoSrc}
          alt="Tamagotchi logo"
          sx={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            boxShadow: '0 8px 24px rgba(99, 72, 121, 0.35)',
            mb: 3,
            animation: 'pulse 1.6s ease-in-out infinite',
          }}
        />
        <Box
          component="h1"
          sx={{
            color: '#634879',
            fontWeight: 700,
            fontSize: '1.8rem',
            letterSpacing: 1,
            m: 0,
          }}
        >
          Tamagotchi
        </Box>

        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.06); }
          }
        `}</style>
      </Box>
    </Fade>
  )
}
