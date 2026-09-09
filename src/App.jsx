import { useState } from 'react'
import Box from '@mui/material/Box'
import './App.css'
import SplashScreen from './components/SplashScreen'
import LoginPage from './components/LoginPage'
import WelcomePage from './pages/WelcomePage'
import HealthPage from './pages/HealthPage'
import TimelinePage from './pages/TimelinePage'
import PlanPage from './pages/PlanPage'
import TeamPage from './pages/TeamPage'
import AppBottomNav from './pages/AppBottomNav'
import logo from './assets/logo.png'

const SECTION_COMPONENTS = {
  home: WelcomePage,
  health: HealthPage,
  timeline: TimelinePage,
  plan: PlanPage,
  team: TeamPage,
}

function MainApp() {
  const [section, setSection] = useState('home')
  const ActiveSection = SECTION_COMPONENTS[section]

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#fff' }}>
      <ActiveSection />
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