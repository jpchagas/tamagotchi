import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function ExamesPage() {
  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 2 }}>Exames</Typography>
      <Typography variant="body2" sx={{ color: '#7a7186' }}>
        Lista de exames solicitados e resultados a revisar aparecerá aqui.
      </Typography>
    </Box>
  )
}
