import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function TeamPage() {
  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h6" sx={{ color: '#634879', fontWeight: 700, mb: 2 }}>
        Team
      </Typography>
      <Typography variant="body2" sx={{ color: '#634879' }}>
        Caregivers, doctors, and family members involved in the care team will show up here.
      </Typography>
    </Box>
  )
}