import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Fab from '@mui/material/Fab'
import AddIcon from '@mui/icons-material/AddRounded'
import HomeIcon from '@mui/icons-material/HomeRounded'
import ShowChartIcon from '@mui/icons-material/ShowChartRounded'
import TaskAltIcon from '@mui/icons-material/TaskAltRounded'
import GroupIcon from '@mui/icons-material/GroupOutlined'
import ScienceIcon from '@mui/icons-material/ScienceOutlined'
import SplashScreen from './components/SplashScreen'
import LoginPage from './components/LoginPage'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import CreateAccountPage from './components/CreateAccountPage'
import CompleteProfilePage from './components/CompleteProfilePage'
import { BottomNav } from './components/ui'
import HealthPage from './pages/HealthPage'
import EvolutionPage from './pages/EvolutionPage'
import PlanPage from './pages/PlanPage'
import TeamPage from './pages/TeamPage'
import RiskPage from './pages/RiskPage'
import UploadExamSheet from './pages/UploadExamSheet'
import DoctorHomePage from './doctor/DoctorHomePage'
import ExamesPage from './doctor/ExamesPage'
import PatientsListPage from './doctor/PatientsListPage'
import PatientDetailPage from './doctor/PatientDetailPage'
import { APP_MAX_WIDTH } from './theme'
import { subscribeToAuthChanges, logout } from './services/authService'
import { getUserProfile } from './services/profileService'
import { subscribeToIncomingRequestsForPatient, subscribeToIncomingRequestsForDoctor } from './services/careTeamService'
import { subscribeToDoctorExamReviews } from './services/examReviewService'

const PATIENT_TABS = [
  { key: 'saude', label: 'Saúde', icon: HomeIcon },
  { key: 'evolucao', label: 'Evolução', icon: ShowChartIcon },
  { key: 'plano', label: 'Plano', icon: TaskAltIcon },
  { key: 'equipe', label: 'Equipe', icon: GroupIcon },
]

function PatientApp({ profile, uid, onLogout }) {
  const [section, setSection] = useState('saude')
  const [openRisk, setOpenRisk] = useState(null)
  const [evolutionFocus, setEvolutionFocus] = useState(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  // Bumped after an upload or a change elsewhere so Saúde reloads.
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)

  useEffect(() => {
    if (!uid) return
    return subscribeToIncomingRequestsForPatient(uid, (requests) => setPendingRequestsCount(requests.length))
  }, [uid])

  const goTo = (next) => {
    setSection(next)
    window.scrollTo(0, 0)
  }

  if (openRisk) {
    return <RiskPage uid={uid} riskType={openRisk} onBack={() => setOpenRisk(null)} />
  }

  const showUploadButton = section === 'saude' || section === 'plano'

  return (
    <Box>
      {section === 'saude' && (
        <HealthPage
          key={refreshKey}
          uid={uid}
          profile={profile}
          onLogout={onLogout}
          pendingRequestsCount={pendingRequestsCount}
          onOpenRisk={setOpenRisk}
          onOpenBiomarker={(key) => { setEvolutionFocus(key); goTo('evolucao') }}
          onOpenTeam={() => goTo('equipe')}
          onOpenPlan={() => goTo('plano')}
        />
      )}
      {section === 'evolucao' && <EvolutionPage uid={uid} initialFocus={evolutionFocus} />}
      {section === 'plano' && <PlanPage uid={uid} />}
      {section === 'equipe' && <TeamPage uid={uid} profile={profile} />}

      {showUploadButton && (
        <Box sx={{ position: 'fixed', bottom: 'calc(96px + env(safe-area-inset-bottom))', left: 0, right: 0, mx: 'auto', maxWidth: APP_MAX_WIDTH, pointerEvents: 'none', zIndex: 11, display: 'flex', justifyContent: 'flex-end', px: 2.5 }}>
          <Fab
            variant="extended"
            color="primary"
            onClick={() => setUploadOpen(true)}
            sx={{ pointerEvents: 'auto', height: 56, px: 2.75, borderRadius: '28px', fontWeight: 700, fontSize: '0.9375rem', boxShadow: '0 10px 24px rgba(99,72,121,0.35)' }}
          >
            <AddIcon sx={{ mr: 0.75 }} />
            Enviar exame
          </Fab>
        </Box>
      )}

      <UploadExamSheet
        open={uploadOpen}
        uid={uid}
        profile={profile}
        onClose={() => setUploadOpen(false)}
        onSent={() => setRefreshKey((k) => k + 1)}
        onOpenTeam={() => { setUploadOpen(false); goTo('equipe') }}
      />

      <BottomNav
        items={PATIENT_TABS.map((t) => (t.key === 'equipe' ? { ...t, badge: pendingRequestsCount } : t))}
        value={section}
        onChange={goTo}
      />
    </Box>
  )
}

const DOCTOR_TABS = [
  { key: 'inicio', label: 'Início', icon: HomeIcon },
  { key: 'pacientes', label: 'Pacientes', icon: GroupIcon },
  { key: 'exames', label: 'Exames', icon: ScienceIcon },
]

function DoctorApp({ profile, uid, onLogout }) {
  const [section, setSection] = useState('inicio')
  const [patientsFilter, setPatientsFilter] = useState('todos')
  const [openPatient, setOpenPatient] = useState(null) // { patientId, patientName }
  const [incomingRequests, setIncomingRequests] = useState([])
  // One live subscription shared by the dashboard, the Exames tab and its
  // badge, so a result the Cloud Function finishes reading shows up everywhere.
  const [reviews, setReviews] = useState(null)
  const [reviewsError, setReviewsError] = useState(false)

  useEffect(() => {
    if (!uid) return
    return subscribeToIncomingRequestsForDoctor(uid, setIncomingRequests)
  }, [uid])

  useEffect(() => {
    if (!uid) return
    return subscribeToDoctorExamReviews(uid, setReviews, () => setReviewsError(true))
  }, [uid])

  const goTo = (next, filter = 'todos') => {
    setPatientsFilter(filter)
    setSection(next)
    window.scrollTo(0, 0)
  }

  if (openPatient) {
    return (
      <PatientDetailPage
        doctorUid={uid}
        doctorProfile={profile}
        patientUid={openPatient.patientId}
        patientName={openPatient.patientName}
        onBack={() => setOpenPatient(null)}
      />
    )
  }

  const pendingReviewCount = (reviews || []).filter((r) => r.reviewStatus === 'not_reviewed').length

  return (
    <Box>
      {section === 'inicio' && (
        <DoctorHomePage
          uid={uid}
          profile={profile}
          onLogout={onLogout}
          reviews={reviews}
          incomingRequestsCount={incomingRequests.length}
          onOpenPatient={setOpenPatient}
          onOpenExams={() => goTo('exames')}
          onOpenPatients={(filter) => goTo('pacientes', filter)}
        />
      )}
      {section === 'pacientes' && (
        <PatientsListPage
          doctorUid={uid}
          doctorProfile={profile}
          reviews={reviews}
          initialFilter={patientsFilter}
          onOpenPatient={setOpenPatient}
        />
      )}
      {section === 'exames' && (
        <ExamesPage reviews={reviews} error={reviewsError} onOpenPatient={setOpenPatient} />
      )}
      <BottomNav
        items={DOCTOR_TABS.map((t) => {
          if (t.key === 'pacientes') return { ...t, badge: incomingRequests.length }
          if (t.key === 'exames') return { ...t, badge: pendingReviewCount }
          return t
        })}
        value={section}
        onChange={goTo}
      />
    </Box>
  )
}

export default function App() {
  // [splash while auth resolves] -> login -> [forgotPassword] -> [createAccount -> completeProfile] -> app
  const [stage, setStage] = useState('splash')
  const [authUser, setAuthUser] = useState(null)
  const [profile, setProfile] = useState(null)
  // Step 1 of sign-up (role, name, e-mail) — kept here because creating the
  // account fires the auth listener before step 2 renders. Empty for Google
  // / Apple sign-ins, where step 2 asks for the role.
  const [signupDraft, setSignupDraft] = useState(null)

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      // subscribeToAuthChanges sets the stage to 'login'; clear eagerly so
      // no stale profile flashes on the next login.
      setProfile(null)
      setSignupDraft(null)
    }
  }

  // Firebase fires this immediately with the current user (or null) on
  // load, then again on every sign-in/out.
  useEffect(() => {
    return subscribeToAuthChanges(async (user) => {
      setAuthUser(user)
      if (!user) {
        setStage('login')
        return
      }
      const existingProfile = await getUserProfile(user.uid)
      if (existingProfile) {
        setProfile(existingProfile)
        setStage('app')
      } else {
        // Authenticated but no profile yet (just signed up, or first
        // Google/Apple login).
        setStage('completeProfile')
      }
    })
  }, [])

  if (stage === 'splash') {
    return <SplashScreen />
  }

  if (stage === 'login') {
    return (
      <LoginPage
        onForgotPassword={() => setStage('forgotPassword')}
        onCreateAccount={() => setStage('createAccount')}
      />
    )
  }

  if (stage === 'forgotPassword') {
    return <ForgotPasswordPage onBack={() => setStage('login')} />
  }

  if (stage === 'createAccount') {
    return (
      <CreateAccountPage
        onBack={() => setStage('login')}
        onDraft={setSignupDraft}
      />
    )
  }

  if (stage === 'completeProfile') {
    return (
      <CompleteProfilePage
        uid={authUser?.uid}
        role={signupDraft?.role}
        initialData={{
          fullName: signupDraft?.fullName || authUser?.displayName || '',
          email: signupDraft?.email || authUser?.email || '',
        }}
        onCancel={handleLogout}
        onSubmit={(fullProfile) => {
          setProfile(fullProfile)
          setStage('app')
        }}
      />
    )
  }

  return profile?.role === 'doctor' ? (
    <DoctorApp profile={profile} uid={authUser?.uid} onLogout={handleLogout} />
  ) : (
    <PatientApp profile={profile} uid={authUser?.uid} onLogout={handleLogout} />
  )
}
