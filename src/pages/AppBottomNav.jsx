import Paper from '@mui/material/Paper'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import HomeIcon from '@mui/icons-material/Home'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder'
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";

const TABS = ['saude', 'linhaDoTempo', 'plano', 'equipe']

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
          backgroundColor: '#ffffff',
          borderTop: '1px solid #eee',
          '& .Mui-selected': { color: '#634879 !important' },
          '& .MuiBottomNavigationAction-root': { color: '#b597d2', minWidth: 0 },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.7rem' },
        }}
      >
        <BottomNavigationAction label="Saúde" icon={<HomeIcon />} />
        <BottomNavigationAction label="Linha do tempo" icon={<AccessTimeIcon />} />
        <BottomNavigationAction label="Plano" icon={<FavoriteBorderIcon />} />
        <BottomNavigationAction label="Equipe médica" icon={<PersonOutlinedIcon />} />
      </BottomNavigation>
    </Paper>
  )
}
