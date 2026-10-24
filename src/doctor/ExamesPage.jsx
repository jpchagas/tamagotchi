import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Skeleton from '@mui/material/Skeleton'
import TaskAltIcon from '@mui/icons-material/TaskAltRounded'
import ReviewCard from './ReviewCard'
import { Page, PageHeader, Segmented, GroupLabel, Section, RowButton, PersonAvatar, Pill, EmptyState } from '../components/ui'
import { colors } from '../theme'
import { groupByReviewStatus, filterByCategory, attentionFirst } from '../services/examReviewService'
import { formatTimeAgo } from '../services/dateUtils'

const CATEGORIES = [
  { value: 'todos', label: 'Todos' },
  { value: 'laboratorial', label: 'Laboratório' },
  { value: 'imagem', label: 'Imagem' },
  { value: 'documento', label: 'Outros' },
]

// `reviews` is DoctorApp's live subscription, so a result the Cloud
// Function finishes reading updates here without a reload.
export default function ExamesPage({ reviews, error, onOpenPatient }) {
  const [category, setCategory] = useState('todos')

  const grouped = groupByReviewStatus(reviews ? filterByCategory(reviews, category) : [])

  return (
    <Page>
      <PageHeader title="Exames" subtitle="Resultados enviados pelos seus pacientes." />
      <Segmented label="Categoria" options={CATEGORIES} value={category} onChange={setCategory} />

      {error && <Typography variant="body2" role="alert" sx={{ color: colors.alert, fontWeight: 600 }}>Não foi possível carregar os exames.</Typography>}
      {!reviews && !error && [0, 1].map((i) => <Skeleton key={i} variant="rounded" height={160} sx={{ borderRadius: '22px' }} />)}

      {reviews && (
        <>
          <GroupLabel>Para revisar ({grouped.not_reviewed.length})</GroupLabel>
          {grouped.not_reviewed.length === 0 ? (
            <Section>
              <EmptyState icon={<TaskAltIcon />} title="Tudo revisado">Nenhum resultado pendente nesta categoria.</EmptyState>
            </Section>
          ) : (
            attentionFirst(grouped.not_reviewed).map((r) => <ReviewCard key={r.id} review={r} onOpenPatient={onOpenPatient} />)
          )}

          {grouped.reviewed.length > 0 && (
            <>
              <GroupLabel>Revisados</GroupLabel>
              <Section padded={false}>
                {grouped.reviewed.map((r) => (
                  <RowButton key={r.id} onClick={() => onOpenPatient({ patientId: r.patientId, patientName: r.patientName })}>
                    <PersonAvatar name={r.patientName} size={40} />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" noWrap>{r.title}</Typography>
                      <Typography variant="body2" sx={{ color: colors.muted }} noWrap>{r.patientName} · {formatTimeAgo(r.submittedAt)}</Typography>
                    </Box>
                    <Pill tone="good">Revisado</Pill>
                  </RowButton>
                ))}
              </Section>
            </>
          )}
        </>
      )}
    </Page>
  )
}
