import { useState } from 'react'
import Box from '@mui/material/Box'
import './App.css'
import SplashScreen from './components/SplashScreen'
import LoginPage from './components/LoginPage'
import HealthPage from './pages/HealthPage'
import TimelinePage from './pages/TimelinePage'
import PlanPage from './pages/PlanPage'
import TeamPage from './pages/TeamPage'
import MetricPage from './pages/MetricPage'
import AppBottomNav from './pages/AppBottomNav'
import logo from './assets/logo.png'

const SECTION_COMPONENTS = {
  saude: HealthPage,
  linhaDoTempo: TimelinePage,
  plano: PlanPage,
  equipe: TeamPage,
}

function MainApp() {
  const [section, setSection] = useState('saude')
  const [openCondition, setOpenCondition] = useState(null) // metric detail overlay

  // Metric detail is a full-screen overlay reached only from HealthPage,
  // not one of the four bottom-nav destinations.
  if (openCondition) {
    return <MetricPage conditionId={openCondition} onBack={() => setOpenCondition(null)} />
  }

  const ActiveSection = SECTION_COMPONENTS[section]

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f7f5fa' }}>
      {section === 'saude' ? (
        <HealthPage onOpenCondition={setOpenCondition} />
      ) : (
        <ActiveSection />
      )}
      <AppBottomNav value={section} onChange={setSection} />
    </Box>
  )
}

export default function App() {
  const [stage, setStage] = useState('splash') // splash -> login -> app

  if (stage === 'splash') {
    return <SplashScreen logoSrc={logo} onFinish={() => setStage('login')} />
  }

  if (stage === 'login') {
    return <LoginPage logoSrc={logo} onLogin={() => setStage('app')} />
  }

  return <MainApp />
}
