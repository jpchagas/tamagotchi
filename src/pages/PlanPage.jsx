import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function PlanPage() {
  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h6" sx={{ color: '#634879', fontWeight: 700, mb: 2 }}>
        Plan
      </Typography>
      <Typography variant="body2" sx={{ color: '#634879' }}>
        The care plan, goals, and scheduled activities will show up here.
      </Typography>
    </Box>
  )
}