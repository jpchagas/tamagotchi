import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import IosShareIcon from '@mui/icons-material/IosShare'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { getConditionDetails } from '../services/conditionsService'

export default function MetricPage({ conditionId, onBack }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(null)

    getConditionDetails(conditionId)
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [conditionId])

  if (error) {
    return (
      <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
        <IconButton onClick={onBack}>
          <ArrowBackIcon sx={{ color: '#2b2338' }} />
        </IconButton>
        <Typography sx={{ color: '#d64545', mt: 2 }}>
          Não foi possível carregar os dados: {error}
        </Typography>
      </Box>
    )
  }

  if (!data) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f7f5fa',
        }}
      >
        <CircularProgress sx={{ color: '#634879' }} />
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <IconButton onClick={onBack}>
          <ArrowBackIcon sx={{ color: '#2b2338' }} />
        </IconButton>
        <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>{data.title}</Typography>
        <IconButton>
          <IosShareIcon sx={{ color: '#2b2338' }} />
        </IconButton>
      </Box>

      <Card sx={{ borderRadius: 4, p: 2, mb: 2, backgroundColor: '#fdeceb' }}>
        <Typography sx={{ color: '#d64545', fontWeight: 700, mb: 0.5 }}>
          {data.alertCount}
        </Typography>
        <Typography variant="body2" sx={{ color: '#8a4b46' }}>
          {data.alertText}
        </Typography>
      </Card>

      <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1 }}>
        O que indicam os seus dados
      </Typography>
      <Card sx={{ borderRadius: 4, p: 2, mb: 2 }}>
        {data.indicators.map((line, i) => (
          <Typography
            key={i}
            variant="body2"
            sx={{ color: '#2b2338', mb: i < data.indicators.length - 1 ? 1 : 0 }}
          >
            → {line}
          </Typography>
        ))}
      </Card>

      <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1 }}>
        Próxima ação recomendada
      </Typography>
      <Card sx={{ borderRadius: 4, p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <CalendarMonthIcon sx={{ color: '#634879' }} />
          <Box>
            <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{data.nextAction}</Typography>
            <Typography variant="body2" sx={{ color: '#7a7186' }}>{data.nextActionWhen}</Typography>
          </Box>
        </Box>
        <Button
          fullWidth
          variant="contained"
          sx={{
            backgroundColor: '#ece5f5',
            color: '#634879',
            boxShadow: 'none',
            fontWeight: 600,
            '&:hover': { backgroundColor: '#dcbced', boxShadow: 'none' },
          }}
        >
          Ver detalhes
        </Button>
      </Card>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, opacity: 0.7 }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: '#7a7186' }} />
        <Typography variant="caption" sx={{ color: '#7a7186' }}>
          Baseado em: {data.source}
        </Typography>
      </Box>
    </Box>
  )
}
