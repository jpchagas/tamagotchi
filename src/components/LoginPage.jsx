import { useState } from 'react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import PetsIcon from '@mui/icons-material/Pets'

export default function LoginPage({ onLogin, logoSrc }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in both fields.')
      return
    }
    setError('')
    onLogin({ email, password })
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, #dcbced 0%, #bc9dda 100%)',
        p: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: '100%',
          maxWidth: 380,
          p: 4,
          borderRadius: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Avatar
          src={logoSrc}
          sx={{ width: 72, height: 72, mb: 2, bgcolor: '#b597d2' }}
        >
          <PetsIcon />
        </Avatar>

        <Typography variant="h5" sx={{ color: '#634879', fontWeight: 700, mb: 3 }}>
          Welcome back
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            sx={fieldSx}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            sx={fieldSx}
          />

          {error && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{
              mt: 3,
              py: 1.3,
              borderRadius: 3,
              backgroundColor: '#634879',
              fontWeight: 600,
              '&:hover': { backgroundColor: '#b597d2' },
            }}
          >
            Log In
          </Button>

          <Button
            fullWidth
            sx={{ mt: 1.5, color: '#634879', textTransform: 'none' }}
            onClick={() => onLogin({ guest: true })}
          >
            Continue as guest
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2,
    '&.Mui-focused fieldset': { borderColor: '#634879' },
  },
  '& label.Mui-focused': { color: '#634879' },
}
