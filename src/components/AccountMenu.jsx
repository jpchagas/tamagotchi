import { useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import LogoutIcon from '@mui/icons-material/LogoutRounded'
import { PersonAvatar } from './ui'
import { colors } from '../theme'

// The signed-in user's avatar; opens a menu with who is signed in and "Sair".
export default function AccountMenu({ profile, onLogout }) {
  const [anchor, setAnchor] = useState(null)
  const subtitle = profile?.role === 'doctor'
    ? [profile?.specialty, profile?.crm && `CRM ${profile.crm}${profile.crmState ? '/' + profile.crmState : ''}`].filter(Boolean).join(' · ')
    : profile?.email

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Conta e configurações" aria-haspopup="menu" sx={{ p: 0 }}>
        <PersonAvatar name={profile?.fullName} solid />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { borderRadius: '18px', minWidth: 240, mt: 1, boxShadow: '0 12px 32px rgba(36,28,48,0.16)' } } }}
      >
        <Box sx={{ px: 2, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PersonAvatar name={profile?.fullName} size={40} />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>{profile?.fullName}</Typography>
            {subtitle && <Typography variant="caption" sx={{ color: colors.muted }} noWrap component="div">{subtitle}</Typography>}
          </Box>
        </Box>
        <Box sx={{ height: '1px', backgroundColor: colors.line, my: 0.5 }} />
        <MenuItem onClick={() => { setAnchor(null); onLogout() }} sx={{ minHeight: 48, fontWeight: 600 }}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          Sair
        </MenuItem>
      </Menu>
    </>
  )
}
