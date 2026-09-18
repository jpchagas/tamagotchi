import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import './App.css'
import SplashScreen from './components/SplashScreen'
import LoginPage from './components/LoginPage'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import CreateAccountPage from './components/CreateAccountPage'
import SelectProfilePage from './components/SelectProfilePage'
import CompleteProfilePage from './components/CompleteProfilePage'
import HealthPage from './pages/HealthPage'
import TimelinePage from './pages/TimelinePage'
import PlanPage from './pages/PlanPage'
import TeamPage from './pages/TeamPage'
import MetricPage from './pages/MetricPage'
import AppBottomNav from './pages/AppBottomNav'
import DoctorHomePage from './doctor/DoctorHomePage'
import ExamesPage from './doctor/ExamesPage'
import ProntuarioPage from './doctor/ProntuarioPage'
import AgendaPage from './doctor/AgendaPage'
import PatientsListPage from './doctor/PatientsListPage'
import DoctorBottomNav from './doctor/DoctorBottomNav'
import logo from './assets/logo.png'
import { subscribeToAuthChanges, logout } from './services/authService'
import { getUserProfile } from './services/profileService'
import { subscribeToIncomingRequestsForPatient, subscribeToIncomingRequestsForDoctor } from './services/careTeamService'

const DOCTOR_SECTION_COMPONENTS = {
  exames: ExamesPage,
  prontuario: ProntuarioPage,
  agenda: AgendaPage,
}

function PatientApp({ profile, uid, onLogout }) {
  const [section, setSection] = useState('saude')
  const [openCondition, setOpenCondition] = useState(null)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const firstName = profile?.fullName?.split(' ')[0] || 'Paciente'

  useEffect(() => {
    if (!uid) return
    const unsubscribe = subscribeToIncomingRequestsForPatient(uid, (requests) => {
      setPendingRequestsCount(requests.length)
    })
    return unsubscribe
  }, [uid])

  if (openCondition) {
    return <MetricPage conditionId={openCondition} onBack={() => setOpenCondition(null)} />
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f7f5fa' }}>
      {section === 'saude' && (
        <HealthPage
          userName={firstName}
          uid={uid}
          onOpenCondition={setOpenCondition}
          onLogout={onLogout}
          pendingRequestsCount={pendingRequestsCount}
        />
      )}
      {section === 'linhaDoTempo' && <TimelinePage uid={uid} />}
      {section === 'plano' && <PlanPage uid={uid} />}
      {section === 'equipe' && <TeamPage uid={uid} profile={profile} />}
      <AppBottomNav
        value={section}
        onChange={setSection}
        badgeCounts={{ equipe: pendingRequestsCount }}
      />
    </Box>
  )
}

function DoctorApp({ profile, uid, onLogout }) {
  const [section, setSection] = useState('pacientes')
  const [viewingPatients, setViewingPatients] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const ActiveSection = DOCTOR_SECTION_COMPONENTS[section]

  useEffect(() => {
    if (!uid) return
    const unsubscribe = subscribeToIncomingRequestsForDoctor(uid, (requests) => {
      setPendingRequestsCount(requests.length)
    })
    return unsubscribe
  }, [uid])

  if (viewingPatients) {
    return (
      <PatientsListPage
        doctorUid={uid}
        doctorProfile={profile}
        onBack={() => setViewingPatients(false)}
      />
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f7f5fa' }}>
      {section === 'pacientes' ? (
        <DoctorHomePage
          doctorName={profile?.fullName?.split(' ')[0]}
          uid={uid}
          onLogout={onLogout}
          onOpenPatients={() => setViewingPatients(true)}
          pendingRequestsCount={pendingRequestsCount}
        />
      ) : (
        <ActiveSection />
      )}
      <DoctorBottomNav
        value={section}
        onChange={setSection}
        badgeCounts={{ pacientes: pendingRequestsCount }}
      />
    </Box>
  )
}

function LoadingScreen() {
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

export default function App() {
  // splash -> login -> [forgotPassword] -> [createAccount -> selectProfile -> completeProfile] -> app
  const [stage, setStage] = useState('splash')
  const [splashDone, setSplashDone] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [authUser, setAuthUser] = useState(null)
  const [role, setRole] = useState(null) // 'patient' | 'doctor'
  const [accountData, setAccountData] = useState({})
  const [profile, setProfile] = useState(null)

  const handleLogout = async () => {
    try {
      await logout()
    } finally {
      // subscribeToAuthChanges will fire with user=null and set stage to
      // 'login' automatically, but we clear these eagerly so no stale
      // profile/role data flashes on the next login.
      setRole(null)
      setProfile(null)
      setAccountData({})
    }
  }

  // Subscribe once on mount. Firebase fires this immediately with the
  // current user (or null) on load, then again on every sign-in/out.
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setAuthUser(user)

      if (user) {
        const existingProfile = await getUserProfile(user.uid)
        if (existingProfile) {
          setProfile(existingProfile)
          setRole(existingProfile.role)
          setStage('app')
        } else {
          // Authenticated (e.g. via Google/Apple) but hasn't finished
          // filling in role-specific profile info yet.
          setAccountData({
            uid: user.uid,
            fullName: user.displayName || '',
            email: user.email || '',
          })
          setStage('selectProfile')
        }
      } else {
        setStage('login')
      }

      setAuthChecked(true)
    })

    return unsubscribe
  }, [])

  // Keep showing the splash animation for its full duration even if auth
  // resolves faster, but don't leave the user stuck on it if auth is slow.
  if (!splashDone) {
    return <SplashScreen logoSrc={logo} onFinish={() => setSplashDone(true)} />
  }

  if (!authChecked) {
    return <LoadingScreen />
  }

  if (stage === 'login') {
    return (
      <LoginPage
        onLogin={() => {}} // stage transition happens via subscribeToAuthChanges above
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
        onGoToLogin={() => setStage('login')}
        onNext={(data) => {
          setAccountData(data)
          setStage('selectProfile')
        }}
      />
    )
  }

  if (stage === 'selectProfile') {
    return (
      <SelectProfilePage
        onGoToLogin={() => setStage('login')}
        onSelect={(selectedRole) => {
          setRole(selectedRole)
          setStage('completeProfile')
        }}
      />
    )
  }

  if (stage === 'completeProfile') {
    return (
      <CompleteProfilePage
        role={role}
        uid={accountData.uid || authUser?.uid}
        initialData={accountData}
        onBack={() => setStage('selectProfile')}
        onSubmit={(fullProfile) => {
          setProfile(fullProfile)
          setStage('app')
        }}
      />
    )
  }

  return role === 'doctor' ? (
    <DoctorApp profile={profile} uid={authUser?.uid} onLogout={handleLogout} />
  ) : (
    <PatientApp profile={profile} uid={authUser?.uid} onLogout={handleLogout} />
  )
}
