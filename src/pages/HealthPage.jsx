import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function HealthPage() {
  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h6" sx={{ color: '#634879', fontWeight: 700, mb: 2 }}>
        Health
      </Typography>
      <Typography variant="body2" sx={{ color: '#634879' }}>
        Vitals, medications, and health metrics will show up here.
      </Typography>
    </Box>
  )
}