import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import FavoriteIcon from '@mui/icons-material/Favorite'

export default function WelcomePage({ userName = 'there' }) {
  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, mt: 1 }}>
        <Avatar sx={{ bgcolor: '#634879', width: 56, height: 56 }}>
          <FavoriteIcon />
        </Avatar>
        <Box>
          <Typography variant="body2" sx={{ color: '#634879', opacity: 0.8 }}>
            Welcome back,
          </Typography>
          <Typography variant="h6" sx={{ color: '#634879', fontWeight: 700 }}>
            {userName}
          </Typography>
        </Box>
      </Box>

      <Card sx={{ borderRadius: 4, mb: 2, backgroundColor: '#dcbced' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#634879' }}>
            Today's summary
          </Typography>
          <Typography variant="body2" sx={{ color: '#634879', mt: 0.5 }}>
            No pending tasks. You're all caught up.
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4, backgroundColor: '#bc9dda' }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#634879' }}>
            Quick actions
          </Typography>
          <Typography variant="body2" sx={{ color: '#634879', mt: 0.5 }}>
            Use the tabs below to check your health data, timeline, care plan, or team.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}