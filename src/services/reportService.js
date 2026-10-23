import { getUserProfile } from './profileService'
import { getLatestRisks } from './risksService'
import { getBiomarkersGrouped, getBiomarkerTypes, computeChange } from './biomarkersService'
import { getConducts } from './conductsService'
import { getExams } from './examsService'
import { calculateAge } from './dateUtils'

// Data for the PDF health report (components/HealthReport.jsx), read with
// the same services as the screens, so a doctor gets exactly what the rules
// already let them see for a linked patient. The period filters history
// (biomarker readings, submitted results); risks, the active plan and open
// exam requests are the patient's current state, whatever the period.

export const REPORT_PERIODS = [
  { value: '3m', label: '3 meses', months: 3, description: 'últimos 3 meses' },
  { value: '12m', label: '12 meses', months: 12, description: 'últimos 12 meses' },
  { value: 'tudo', label: 'Tudo', months: null, description: 'todo o histórico' },
]

function periodStart(months) {
  if (!months) return null
  const start = new Date()
  start.setMonth(start.getMonth() - months)
  return start
}

export async function getHealthReportData(patientId, { months }) {
  const [profile, risks, readingsByType, biomarkerTypes, conducts, exams] = await Promise.all([
    getUserProfile(patientId),
    getLatestRisks(patientId),
    getBiomarkersGrouped(patientId),
    getBiomarkerTypes(),
    getConducts(patientId),
    getExams(patientId),
  ])
  const since = periodStart(months)
  const inPeriod = (date) => !since || (date && date >= since)

  // One row per biomarker measured in the period; the change is first to
  // last reading in the period (like Evolução), not just the last step.
  const biomarkers = Object.entries(readingsByType)
    .map(([key, readings]) => {
      const shown = readings.filter((r) => inPeriod(r.recordedAt))
      if (shown.length === 0) return null
      const type = biomarkerTypes[key]
      const first = shown[0]
      const latest = shown[shown.length - 1]
      return {
        key,
        label: type?.label || key,
        unit: type?.unit || latest.unit || '',
        readings: shown,
        first,
        latest,
        change: shown.length > 1 ? computeChange([first, latest], type?.goodDirection) : null,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

  return {
    patient: {
      fullName: profile?.fullName || '',
      age: calculateAge(profile?.dateOfBirth),
      sexAssignedAtBirth: profile?.sexAssignedAtBirth || '',
      cityState: profile?.cityState || '',
    },
    risks,
    biomarkers,
    activeConducts: conducts.filter((c) => c.status !== 'done'),
    openExamRequests: exams.filter((e) => e.kind !== 'result' && e.status !== 'realizado'),
    results: exams
      .filter((e) => e.kind === 'result' && inPeriod(e.submittedAt))
      .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0)),
  }
}
