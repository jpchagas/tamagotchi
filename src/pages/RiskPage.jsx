import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import IosShareIcon from '@mui/icons-material/IosShare'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { getRiskHistory, riskTypeLabel, formatRiskValue, RISK_CATEGORIES } from '../services/risksService'
import { getBiomarkerTypes } from '../services/biomarkersService'

const NEUTRAL_STYLE = { color: '#634879', bg: '#ece5f5' }

function formatDate(date) {
  return date ? date.toLocaleDateString('pt-BR') : ''
}

export default function RiskPage({ uid, riskType, onBack }) {
  const [history, setHistory] = useState(null)
  const [biomarkerTypes, setBiomarkerTypes] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setHistory(null)
    setError(null)

    Promise.all([getRiskHistory(uid, riskType), getBiomarkerTypes()])
      .then(([risks, types]) => {
        if (cancelled) return
        setHistory(risks)
        setBiomarkerTypes(types)
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar os dados.')
      })

    return () => {
      cancelled = true
    }
  }, [uid, riskType])

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
      <IconButton onClick={onBack}>
        <ArrowBackIcon sx={{ color: '#2b2338' }} />
      </IconButton>
      <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>Risco {riskTypeLabel(riskType)}</Typography>
      <IconButton>
        <IosShareIcon sx={{ color: '#2b2338' }} />
      </IconButton>
    </Box>
  )

  if (error) {
    return (
      <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
        {header}
        <Typography sx={{ color: '#d64545', mt: 2 }}>{error}</Typography>
      </Box>
    )
  }

  if (!history) {
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

  const [current, ...previous] = history
  if (!current) {
    return (
      <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
        {header}
        <Typography variant="body2" sx={{ color: '#7a7186' }}>Este risco ainda não foi calculado.</Typography>
      </Box>
    )
  }

  const style = RISK_CATEGORIES[current.category] || NEUTRAL_STYLE
  const inputs = Object.entries(current.inputs || {})

  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      {header}

      <Card sx={{ borderRadius: 4, p: 2, mb: 2, backgroundColor: style.bg }}>
        <Typography sx={{ color: style.color, fontWeight: 700, mb: 0.5 }}>
          Risco {formatRiskValue(current)}
        </Typography>
        <Typography variant="body2" sx={{ color: '#2b2338' }}>
          {current.horizonYears ? `Probabilidade estimada em ${current.horizonYears} anos. ` : ''}
          Calculado em {formatDate(current.calculatedAt)}.
        </Typography>
      </Card>

      <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1 }}>
        O que indicam os seus dados
      </Typography>
      <Card sx={{ borderRadius: 4, p: 2, mb: 2 }}>
        {inputs.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#7a7186' }}>
            Este cálculo não registrou os indicadores usados.
          </Typography>
        ) : (
          inputs.map(([key, value], i) => {
            const type = biomarkerTypes[key]
            return (
              <Typography key={key} variant="body2" sx={{ color: '#2b2338', mb: i < inputs.length - 1 ? 1 : 0 }}>
                → {type?.label || key}: {String(value).replace('.', ',')}{type?.unit ? ` ${type.unit}` : ''}
              </Typography>
            )
          })
        )}
      </Card>

      {previous.length > 0 && (
        <>
          <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1 }}>
            Cálculos anteriores
          </Typography>
          <Card sx={{ borderRadius: 4, p: 2, mb: 2 }}>
            {previous.map((risk) => (
              <Box key={risk.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#7a7186' }}>{formatDate(risk.calculatedAt)}</Typography>
                <Typography variant="body2" sx={{ color: RISK_CATEGORIES[risk.category]?.color || '#2b2338', fontWeight: 600 }}>
                  {formatRiskValue(risk)}
                </Typography>
              </Box>
            ))}
          </Card>
        </>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, opacity: 0.7 }}>
        <InfoOutlinedIcon sx={{ fontSize: 16, color: '#7a7186' }} />
        <Typography variant="caption" sx={{ color: '#7a7186' }}>
          Baseado em: {current.model}
        </Typography>
      </Box>
    </Box>
  )
}
