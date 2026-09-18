import Paper from '@mui/material/Paper'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Badge from '@mui/material/Badge'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'

const TABS = ['pacientes', 'exames', 'prontuario', 'agenda']

function withBadge(icon, count) {
  if (!count) return icon
  return (
    <Badge badgeContent={count} color="error" max={9}>
      {icon}
    </Badge>
  )
}

export default function DoctorBottomNav({ value, onChange, badgeCounts = {} }) {
  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10 }}
      elevation={8}
    >
      <BottomNavigation
        value={TABS.indexOf(value)}
        onChange={(_, newIndex) => onChange(TABS[newIndex])}
        showLabels
        sx={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #eee',
          '& .Mui-selected': { color: '#634879 !important' },
          '& .MuiBottomNavigationAction-root': { color: '#b597d2', minWidth: 0 },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.7rem' },
        }}
      >
        <BottomNavigationAction label="Pacientes" icon={withBadge(<GroupOutlinedIcon />, badgeCounts.pacientes)} />
        <BottomNavigationAction label="Exames" icon={<ScienceOutlinedIcon />} />
        <BottomNavigationAction label="Prontuário" icon={<DescriptionOutlinedIcon />} />
        <BottomNavigationAction label="Agenda" icon={<EventOutlinedIcon />} />
      </BottomNavigation>
    </Paper>
  )
}
