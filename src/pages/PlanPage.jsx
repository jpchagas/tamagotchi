import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Collapse from '@mui/material/Collapse'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import CheckIcon from '@mui/icons-material/CheckRounded'
import ScienceIcon from '@mui/icons-material/ScienceOutlined'
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined'
import TaskAltIcon from '@mui/icons-material/TaskAltRounded'
import { Page, PageHeader, GroupLabel, Pill, EmptyState } from '../components/ui'
import { ProcessingStatusChip, ExtractedDataPanel } from '../components/DocumentProcessing'
import { useToast } from '../components/toastContext'
import { colors, cardShadow } from '../theme'
import { subscribeToConducts, setConductDone, formatRelativeDate } from '../services/conductsService'
import { subscribeToExams } from '../services/examsService'
import { formatTimeAgo } from '../services/dateUtils'

const PERIODS = [
  { key: 'agora', label: 'Agora' },
  { key: 'proximos90', label: 'Próximos 90 dias' },
  { key: 'esteAno', label: 'Este ano' },
  { key: 'longoPrazo', label: 'Longo prazo' },
]

const CONDUCT_TAGS = {
  medication: 'Remédio',
  diet: 'Dieta',
  exercise: 'Exercício',
  followup: 'Consulta',
}

// Exam requests have a date, not a timeframe: bucket them the same way.
function periodForDate(date) {
  if (!date) return 'agora'
  const days = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (days <= 30) return 'agora'
  if (days <= 90) return 'proximos90'
  if (days <= 365) return 'esteAno'
  return 'longoPrazo'
}

function Item({ item, expanded, onToggleExpand, onToggleDone }) {
  const isExam = item.kind === 'exam'
  const done = item.done
  const hasDetails = item.why || item.attachmentUrl || item.processingStatus
  return (
    <Box sx={{ borderBottom: `1px solid ${colors.line}`, '&:last-of-type': { borderBottom: 'none' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, minHeight: 60 }}>
        {isExam ? (
          <Box sx={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: colors.infoBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ScienceIcon sx={{ fontSize: 18, color: colors.info }} />
          </Box>
        ) : (
          <ButtonBase
            onClick={onToggleDone}
            aria-label={done ? `Desmarcar: ${item.title}` : `Marcar como feito: ${item.title}`}
            aria-pressed={done}
            sx={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, border: `2px solid ${done ? colors.brand : '#C9BFD4'}`, backgroundColor: done ? colors.brand : colors.surface, transition: 'all 150ms' }}
          >
            {done && <CheckIcon sx={{ fontSize: 18, color: '#FFFFFF' }} />}
          </ButtonBase>
        )}
        <ButtonBase onClick={hasDetails ? onToggleExpand : undefined} disabled={!hasDetails} aria-expanded={hasDetails ? expanded : undefined} sx={{ flexGrow: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between', textAlign: 'left', borderRadius: 2, py: 0.5 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ color: done ? colors.subtle : colors.ink, textDecoration: done ? 'line-through' : 'none' }}>{item.title}</Typography>
            <Typography variant="caption" sx={{ color: colors.muted }}>{item.meta}</Typography>
          </Box>
          <Pill tone={isExam ? 'info' : 'brand'}>{item.tag}</Pill>
        </ButtonBase>
      </Box>
      {hasDetails && (
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ px: 1.5, pb: 1.75, pl: 7.25 }}>
            {item.why && <Typography variant="body2" sx={{ color: colors.muted, mb: 1 }}>{item.why}</Typography>}
            {(item.attachmentUrl || item.processingStatus) && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                {item.attachmentUrl ? (
                  <Button size="small" href={item.attachmentUrl} target="_blank" rel="noopener noreferrer" startIcon={<DescriptionIcon />} sx={{ minHeight: 36, px: 1 }}>
                    {isExam ? 'Ver pedido' : 'Ver receita'}
                  </Button>
                ) : <span />}
                <ProcessingStatusChip status={item.processingStatus} />
              </Box>
            )}
            <ExtractedDataPanel item={item} />
          </Box>
        </Collapse>
      )}
    </Box>
  )
}

export default function PlanPage({ uid }) {
  const toast = useToast()
  const [conducts, setConducts] = useState(null)
  const [exams, setExams] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState('')

  // Live: extraction runs in a Cloud Function on its own schedule, so a
  // status chip flips to "Dados extraídos" without a refresh.
  useEffect(() => {
    if (!uid) return
    const onError = () => setError('Não foi possível carregar seu plano.')
    const unsubscribeConducts = subscribeToConducts(uid, setConducts, onError)
    const unsubscribeExams = subscribeToExams(uid, setExams, onError)
    return () => {
      unsubscribeConducts()
      unsubscribeExams()
    }
  }, [uid])

  const toggleDone = async (item) => {
    try {
      await setConductDone(item.id, !item.done)
      if (!item.done) {
        toast('Marcado como feito', { action: { label: 'Desfazer', onClick: () => setConductDone(item.id, false) } })
      }
    } catch {
      toast('Não foi possível atualizar. Tente novamente.')
    }
  }

  const loading = !conducts || !exams
  const items = loading ? [] : [
    ...conducts.map((c) => ({
      ...c,
      kind: 'conduct',
      done: c.status === 'done',
      period: c.timeframe,
      tag: CONDUCT_TAGS[c.type] || 'Plano',
      meta: [formatRelativeDate(c.dueDate), c.doctorName].filter(Boolean).join(' · '),
    })),
    ...exams
      .filter((e) => e.kind !== 'result' && e.status !== 'realizado')
      .map((e) => ({
        ...e,
        kind: 'exam',
        done: false,
        period: periodForDate(e.scheduledDate),
        tag: 'Exame',
        meta: [`Fazer ${formatRelativeDate(e.scheduledDate).toLowerCase()}`, e.priority === 'prioritario' ? 'prioritário' : null, e.doctorName].filter(Boolean).join(' · '),
      })),
  ]
  const results = loading ? [] : exams.filter((e) => e.kind === 'result').sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))

  const conductItems = items.filter((i) => i.kind === 'conduct')
  const doneCount = conductItems.filter((i) => i.done).length
  // Pending first, done last, within each period.
  const byPeriod = PERIODS.map((p) => ({
    ...p,
    items: items.filter((i) => (PERIODS.some((x) => x.key === i.period) ? i.period : 'agora') === p.key).sort((a, b) => a.done - b.done),
  })).filter((p) => p.items.length > 0)

  return (
    <Page bottomSpace={22}>
      <PageHeader
        title="Seu plano"
        subtitle={conductItems.length > 0 ? `${doneCount} de ${conductItems.length} ${conductItems.length > 1 ? 'itens feitos' : 'item feito'}` : 'Orientações e exames da sua equipe.'}
      />
      {conductItems.length > 0 && (
        <LinearProgress variant="determinate" value={(doneCount / conductItems.length) * 100} aria-label="Progresso do plano" sx={{ height: 8, borderRadius: 4, backgroundColor: colors.segment }} />
      )}

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>{error}</Typography>}

      {loading && !error && [0, 1].map((i) => <Skeleton key={i} variant="rounded" height={180} sx={{ borderRadius: '22px' }} />)}

      {!loading && byPeriod.length === 0 && results.length === 0 && (
        <EmptyState icon={<TaskAltIcon />} title="Seu plano está vazio">
          Quando seu médico enviar uma receita ou pedir um exame, ele aparece aqui.
        </EmptyState>
      )}

      {byPeriod.map((period) => (
        <Box key={period.key} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <GroupLabel>{period.label}</GroupLabel>
          <Box sx={{ backgroundColor: colors.surface, borderRadius: '22px', boxShadow: cardShadow, py: 0.5 }}>
            {period.items.map((item) => (
              <Item
                key={item.id}
                item={item}
                expanded={expanded === item.id}
                onToggleExpand={() => setExpanded(expanded === item.id ? null : item.id)}
                onToggleDone={() => toggleDone(item)}
              />
            ))}
          </Box>
        </Box>
      ))}

      {results.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <GroupLabel>Resultados enviados</GroupLabel>
          <Box sx={{ backgroundColor: colors.surface, borderRadius: '22px', boxShadow: cardShadow, py: 0.5 }}>
            {results.map((r) => {
              const open = expanded === r.id
              return (
                <Box key={r.id} sx={{ borderBottom: `1px solid ${colors.line}`, '&:last-of-type': { borderBottom: 'none' } }}>
                  <ButtonBase onClick={() => setExpanded(open ? null : r.id)} aria-expanded={open} sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1.25, minHeight: 60, textAlign: 'left', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap>{r.title}</Typography>
                      <Typography variant="caption" sx={{ color: colors.muted }}>
                        {[`Enviado ${formatTimeAgo(r.submittedAt)}`, r.reviewStatus === 'reviewed' ? `revisado por ${r.doctorName}` : r.doctorName && `para ${r.doctorName}`].filter(Boolean).join(' · ')}
                      </Typography>
                    </Box>
                    <ProcessingStatusChip status={r.processingStatus} />
                  </ButtonBase>
                  <Collapse in={open} unmountOnExit>
                    <Box sx={{ px: 1.5, pb: 1.75 }}>
                      {r.attachmentUrl && (
                        <Button size="small" href={r.attachmentUrl} target="_blank" rel="noopener noreferrer" startIcon={<DescriptionIcon />} sx={{ minHeight: 36, px: 1 }}>Ver arquivo</Button>
                      )}
                      <ExtractedDataPanel item={r} />
                    </Box>
                  </Collapse>
                </Box>
              )
            })}
          </Box>
        </Box>
      )}
    </Page>
  )
}
