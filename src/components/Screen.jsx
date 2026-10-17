import Box from '@mui/material/Box'
import { keyframes } from '@mui/material/styles'

const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`

const slideIn = keyframes`
  from { opacity: 0; transform: translateX(28px); }
  to { opacity: 1; transform: none; }
`

// Entrance animation for a screen. Give it a `key` that changes with the
// screen so it replays: "tab" for switching tabs, "push" for a screen
// opened on top (patient hub, forms). Off for reduced-motion users.
export default function Screen({ variant = 'tab', children }) {
  return (
    <Box
      sx={{
        animation: `${variant === 'push' ? slideIn : fadeUp} ${variant === 'push' ? 240 : 180}ms cubic-bezier(0.2, 0, 0, 1) both`,
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      {children}
    </Box>
  )
}
