import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import LogoutIcon from '@mui/icons-material/Logout'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined'
import MonitorHeartOutlinedIcon from '@mui/icons-material/MonitorHeartOutlined'
import { getDoctorPatients } from '../services/careTeamService'
import { getDoctorExamReviews } from '../services/examReviewService'
import { getLatestRisksForPatients, riskTypeLabel } from '../services/risksService'

const ICON_SX = { color: '#634879' }

function pluralPatients(n) {
  return `${n} paciente${n > 1 ? 's' : ''}`
}

// Everything on the dashboard is derived from three reads: the doctor's
// confirmed careLinks, their exam results, and those patients' latest risks.
async function loadDashboard(doctorId) {
  const [links, reviews] = await Promise.all([getDoctorPatients(doctorId), getDoctorExamReviews(doctorId)])
  const patientIds = links.filter((l) => l.status === 'confirmed').map((l) => l.patientId)
  const risks = patientIds.length > 0 ? await getLatestRisksForPatients(patientIds) : []

  const pendingReviews = reviews.filter((r) => r.reviewStatus === 'not_reviewed')
  const highRiskPatientsByType = {}
  risks
    .filter((r) => r.category === 'alto')
    .forEach((r) => {
      highRiskPatientsByType[r.riskType] = highRiskPatientsByType[r.riskType] || new Set()
      highRiskPatientsByType[r.riskType].add(r.patientId)
    })

  return {
    patientCount: patientIds.length,
    pendingReviewCount: pendingReviews.length,
    pendingReviewPatientCount: new Set(pendingReviews.map((r) => r.patientId)).size,
    highRiskPatientsByType,
  }
}

function StatCard({ label, value, onClick }) {
  return (
    <Card
      onClick={onClick}
      sx={{ borderRadius: 4, p: 2, flex: 1, cursor: onClick ? 'pointer' : 'default' }}
    >
      <Typography variant="body2" sx={{ color: '#7a7186', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 700, color: '#2b2338', fontSize: '1.8rem' }}>
        {value}
      </Typography>
    </Card>
  )
}

export default function DoctorHomePage({ doctorName = 'Ricardo', uid, onLogout, onOpenPatients, pendingRequestsCount = 0 }) {
  const [dashboard, setDashboard] = useState(null)

  useEffect(() => {
    if (!uid) return
    loadDashboard(uid)
      .then(setDashboard)
      .catch(() => {
        // Non-fatal — the cards fall back to the placeholder dash below.
      })
  }, [uid])

  const show = (value) => (dashboard ? String(value) : '—')

  const alerts = []
  if (dashboard?.pendingReviewPatientCount > 0) {
    alerts.push({ icon: <ScienceOutlinedIcon sx={ICON_SX} />, label: 'Exames a revisar', count: pluralPatients(dashboard.pendingReviewPatientCount) })
  }
  if (pendingRequestsCount > 0) {
    alerts.push({ icon: <PersonAddAltOutlinedIcon sx={ICON_SX} />, label: 'Solicitações de vínculo', count: pluralPatients(pendingRequestsCount) })
  }
  Object.entries(dashboard?.highRiskPatientsByType || {}).forEach(([riskType, patients]) => {
    alerts.push({ icon: <MonitorHeartOutlinedIcon sx={ICON_SX} />, label: `Risco ${riskTypeLabel(riskType).toLowerCase()} alto`, count: pluralPatients(patients.size) })
  })

  return (
    <Box sx={{ p: 2, pb: 10, backgroundColor: '#f7f5fa', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, mt: 1 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, color: '#2b2338', fontSize: '1.2rem' }}>
            Painel do médico
          </Typography>
          <Typography variant="body2" sx={{ color: '#7a7186' }}>
            Bom dia, Dr. {doctorName}!
          </Typography>
        </Box>
        <Box>
          <IconButton>
            <Badge badgeContent={pendingRequestsCount} color="error" max={9}>
              <NotificationsNoneIcon sx={{ color: '#2b2338' }} />
            </Badge>
          </IconButton>
          <IconButton onClick={onLogout} aria-label="Sair">
            <LogoutIcon sx={{ color: '#2b2338' }} />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
        <StatCard
          label="Pacientes em acompanhamento"
          value={show(dashboard?.patientCount)}
          onClick={onOpenPatients}
        />
        <StatCard label="Pendências" value={show((dashboard?.pendingReviewCount ?? 0) + pendingRequestsCount)} />
      </Box>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <StatCard label="Exames a revisar" value={show(dashboard?.pendingReviewCount)} />
        {/* No appointments collection yet. */}
        <StatCard label="Consultas hoje" value="—" />
      </Box>

      <Card sx={{ borderRadius: 4, p: 2 }}>
        <Typography sx={{ fontWeight: 700, color: '#2b2338', mb: 1.5 }}>
          Alertas e pendências
        </Typography>
        {dashboard && alerts.length === 0 && (
          <Typography variant="body2" sx={{ color: '#7a7186' }}>Nenhum alerta no momento.</Typography>
        )}
        {alerts.map((a, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 1.1,
              borderBottom: i < alerts.length - 1 ? '1px solid #f0eef3' : 'none',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
              {a.icon}
              <Typography sx={{ color: '#2b2338' }}>{a.label}</Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#7a7186', fontWeight: 600 }}>
              {a.count}
            </Typography>
          </Box>
        ))}
      </Card>
    </Box>
  )
}
