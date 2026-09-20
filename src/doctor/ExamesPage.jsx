import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Skeleton from '@mui/material/Skeleton'
import CircularProgress from '@mui/material/CircularProgress'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import { getDoctorExamReviews, groupByReviewStatus, filterByCategory, markExamReviewed } from '../services/examReviewService'

const CATEGORY_TABS = [
  { key: 'todos', label: 'Todos' },
  { key: 'laboratorial', label: 'Laboratoriais' },
  { key: 'imagem', label: 'Imagem' },
  { key: 'documento', label: 'Documentos' },
]

export default function ExamesPage({ uid }) {
  const [reviews, setReviews] = useState(null)
  const [category, setCategory] = useState('todos')
  const [error, setError] = useState('')
  const [reviewingId, setReviewingId] = useState(null)

  const load = () => {
    if (!uid) return
    getDoctorExamReviews(uid)
      .then(setReviews)
      .catch(() => setError('Não foi possível carregar os exames.'))
  }

  useEffect(() => {
    if (!uid) {
      setError('Usuário não identificado.')
      return
    }
    load()
  }, [uid])

  const handleMarkReviewed = async (review) => {
    setReviewingId(review.id)
    try {
      await markExamReviewed(uid, review.patientUid, review.examId)
      load()
    } catch {
      setError('Não foi possível marcar como revisado. Tente novamente.')
    } finally {
      setReviewingId(null)
    }
  }

  const filtered = reviews ? filterByCategory(reviews, category) : []
  const grouped = groupByReviewStatus(filtered)

  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1.5 }}>Exames a revisar</Typography>

      <Tabs
        value={category}
        onChange={(_, v) => setCategory(v)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          mb: 2, minHeight: 0,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, color: '#7a7186', minHeight: 0, py: 1 },
          '& .Mui-selected': { color: '#634879 !important' },
          '& .MuiTabs-indicator': { backgroundColor: '#634879' },
        }}
      >
        {CATEGORY_TABS.map((t) => (
          <Tab key={t.key} value={t.key} label={t.label} />
        ))}
      </Tabs>

      {error && (
        <Typography variant="body2" sx={{ color: '#d64545', mb: 2 }}>
          {error}
        </Typography>
      )}

      {!reviews && !error && (
        <>
          {[0, 1].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ height: 80, borderRadius: 4, mb: 1.5 }} />
          ))}
        </>
      )}

      {reviews && (
        <>
          <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700 }}>
            NÃO REVISADOS ({grouped.not_reviewed.length})
          </Typography>

          {grouped.not_reviewed.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#7a7186', mt: 1, mb: 2 }}>
              Nenhum exame pendente de revisão nesta categoria.
            </Typography>
          ) : (
            grouped.not_reviewed.map((review) => (
              <Card key={review.id} sx={{ borderRadius: 4, p: 2, mt: 1, mb: 1.5, backgroundColor: '#fdf1e6' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700, color: '#2b2338' }}>{review.title}</Typography>
                    <Typography variant="body2" sx={{ color: '#7a7186' }}>{review.patientName}</Typography>
                  </Box>
                  <Chip label="Não revisado" size="small" sx={{ backgroundColor: '#fde3c6', color: '#e08a3c', fontWeight: 600 }} />
                </Box>

                <Button
                  href={review.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<DescriptionOutlinedIcon />}
                  size="small"
                  sx={{ mt: 1, color: '#634879', textTransform: 'none', p: 0, minWidth: 0 }}
                >
                  Ver arquivo
                </Button>

                <Button
                  fullWidth
                  variant="contained"
                  disabled={reviewingId === review.id}
                  onClick={() => handleMarkReviewed(review)}
                  sx={{ mt: 1.5, backgroundColor: '#634879', borderRadius: 3, py: 1, fontWeight: 600, textTransform: 'none', '&:hover': { backgroundColor: '#4f3a63' } }}
                >
                  {reviewingId === review.id ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Marcar como revisado'}
                </Button>
              </Card>
            ))
          )}

          <Typography variant="caption" sx={{ color: '#b3aebb', fontWeight: 700, mt: 1, display: 'block' }}>
            REVISADOS
          </Typography>

          {grouped.reviewed.length === 0 ? (
            <Typography variant="body2" sx={{ color: '#7a7186', mt: 1 }}>
              Nenhum exame revisado nesta categoria ainda.
            </Typography>
          ) : (
            grouped.reviewed.map((review) => (
              <Card key={review.id} sx={{ borderRadius: 4, p: 1.6, mt: 1, mb: 1.2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ fontWeight: 600, color: '#2b2338' }}>{review.title}</Typography>
                  <Typography variant="body2" sx={{ color: '#7a7186' }}>{review.patientName}</Typography>
                </Box>
                <Chip label="Revisado" size="small" sx={{ backgroundColor: '#e6f5ea', color: '#3ba55c', fontWeight: 600 }} />
              </Card>
            ))
          )}
        </>
      )}
    </Box>
  )
}
