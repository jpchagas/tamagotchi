import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function TimelinePage() {
  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h6" sx={{ color: '#634879', fontWeight: 700, mb: 2 }}>
        Timeline
      </Typography>
      <Typography variant="body2" sx={{ color: '#634879' }}>
        A chronological feed of care events and updates will show up here.
      </Typography>
    </Box>
  )
}