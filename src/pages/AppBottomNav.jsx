import Paper from '@mui/material/Paper'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import TimelineIcon from '@mui/icons-material/Timeline'
import AssignmentIcon from '@mui/icons-material/Assignment'
import GroupsIcon from '@mui/icons-material/Groups'

const TABS = ['health', 'timeline', 'plan', 'team']

export default function AppBottomNav({ value, onChange }) {
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
          backgroundColor: '#dcbced',
          '& .Mui-selected': { color: '#634879 !important' },
          '& .MuiBottomNavigationAction-root': { color: '#b597d2' },
        }}
      >
        <BottomNavigationAction label="Health" icon={<MonitorHeartIcon />} />
        <BottomNavigationAction label="Timeline" icon={<TimelineIcon />} />
        <BottomNavigationAction label="Plan" icon={<AssignmentIcon />} />
        <BottomNavigationAction label="Team" icon={<GroupsIcon />} />
      </BottomNavigation>
    </Paper>
  )
}