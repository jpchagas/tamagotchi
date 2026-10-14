import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import InfoIcon from '@mui/icons-material/InfoOutlined'
import { Page, PageHeader, Section, RiskIcon, Pill } from '../components/ui'
import { TONES } from '../components/uiHelpers'
import { colors } from '../theme'
import { getRiskHistory, riskTypeLabel, formatRiskValue, riskTone } from '../services/risksService'
import { getBiomarkerTypes } from '../services/biomarkersService'

const formatDate = (date) => (date ? date.toLocaleDateString('pt-BR') : '')

export default function RiskPage({ uid, riskType, onBack }) {
  const [history, setHistory] = useState(null)
  const [biomarkerTypes, setBiomarkerTypes] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getRiskHistory(uid, riskType), getBiomarkerTypes()])
      .then(([risks, types]) => {
        if (cancelled) return
        setHistory(risks)
        setBiomarkerTypes(types)
      })
      .catch(() => !cancelled && setError('Não foi possível carregar os dados.'))
    return () => {
      cancelled = true
    }
  }, [uid, riskType])

  const [current, ...previous] = history || []
  const tone = TONES[riskTone(current)]
  const inputs = Object.entries(current?.inputs || {})

  return (
    <Page bottomSpace={4}>
      <PageHeader onBack={onBack} title={`Risco ${riskTypeLabel(riskType).toLowerCase()}`} />

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}
      {!history && !error && <Skeleton variant="rounded" height={140} sx={{ borderRadius: '22px' }} />}
      {history && !current && <Typography sx={{ color: colors.muted }}>Este risco ainda não foi calculado.</Typography>}

      {current && (
        <>
          <Box sx={{ backgroundColor: tone.bg, borderRadius: '22px', p: 2.25, display: 'flex', gap: 1.75, alignItems: 'flex-start' }}>
            <RiskIcon riskType={riskType} tone={riskTone(current)} size={44} />
            <Box>
              <Typography sx={{ fontSize: '1.375rem', fontWeight: 800, color: tone.color, lineHeight: 1.2 }}>{formatRiskValue(current)}</Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {current.horizonYears ? `Probabilidade estimada em ${current.horizonYears} anos. ` : ''}
                Calculado em {formatDate(current.calculatedAt)}.
              </Typography>
            </Box>
          </Box>

          <Section title="O que indicam os seus dados">
            {inputs.length === 0 ? (
              <Typography variant="body2" sx={{ color: colors.muted }}>Este cálculo não registrou os indicadores usados.</Typography>
            ) : (
              inputs.map(([key, value]) => {
                const type = biomarkerTypes[key]
                return (
                  <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: `1px solid ${colors.line}`, '&:last-of-type': { borderBottom: 'none' } }}>
                    <Typography variant="body2" sx={{ color: colors.muted }}>{type?.label || key}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{String(value).replace('.', ',')}{type?.unit ? ` ${type.unit}` : ''}</Typography>
                  </Box>
                )
              })
            )}
          </Section>

          {previous.length > 0 && (
            <Section title="Cálculos anteriores">
              {previous.map((risk) => (
                <Box key={risk.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
                  <Typography variant="body2" sx={{ color: colors.muted }}>{formatDate(risk.calculatedAt)}</Typography>
                  <Pill tone={riskTone(risk)}>{formatRiskValue(risk)}</Pill>
                </Box>
              ))}
            </Section>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: colors.muted, px: 0.5 }}>
            <InfoIcon sx={{ fontSize: 16 }} />
            <Typography variant="caption">Baseado em: {current.model}. Converse com seu médico antes de mudar qualquer tratamento.</Typography>
          </Box>
        </>
      )}
    </Page>
  )
}
