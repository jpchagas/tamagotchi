import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import NotificationsIcon from '@mui/icons-material/NotificationsNoneRounded'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActiveOutlined'
import ScienceIcon from '@mui/icons-material/ScienceOutlined'
import MedicationIcon from '@mui/icons-material/MedicationOutlined'
import TaskAltIcon from '@mui/icons-material/TaskAltRounded'
import ErrorIcon from '@mui/icons-material/ErrorOutlineRounded'
import InsightsIcon from '@mui/icons-material/InsightsRounded'
import IosShareIcon from '@mui/icons-material/IosShareRounded'
import { BottomSheet, EmptyState } from './ui'
import { TONES } from './uiHelpers'
import { useToast } from './toastContext'
import { colors } from '../theme'
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationsService'
import { getPushStatus, enablePush } from '../services/pushService'
import { formatTimeAgo } from '../services/dateUtils'

const TYPE_STYLE = {
  exam_requested: { icon: ScienceIcon, tone: 'info' },
  conduct_created: { icon: MedicationIcon, tone: 'brand' },
  result_read: { icon: InsightsIcon, tone: 'good' },
  result_failed: { icon: ErrorIcon, tone: 'alert' },
  result_reviewed: { icon: TaskAltIcon, tone: 'good' },
  result_submitted: { icon: ScienceIcon, tone: 'warn' },
}

function PushPrompt({ uid }) {
  const toast = useToast()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getPushStatus().then(setStatus)
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const ok = await enablePush(uid)
      toast(ok ? 'Avisos ativados neste aparelho' : 'Os avisos continuam desativados')
      setStatus(await getPushStatus())
    } catch {
      toast('Não foi possível ativar os avisos.')
    } finally {
      setBusy(false)
    }
  }

  if (!status) return null
  if (status.needsInstall) {
    return (
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', p: 1.75, borderRadius: '16px', backgroundColor: colors.ground, mb: 2 }}>
        <IosShareIcon sx={{ color: colors.brand, mt: 0.25 }} />
        <Typography variant="body2" sx={{ color: colors.muted }}>
          Para receber avisos no iPhone, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Abra o app por lá.
        </Typography>
      </Box>
    )
  }
  if (!status.available || status.permission === 'granted') return null
  if (status.permission === 'denied') {
    return (
      <Typography variant="body2" sx={{ color: colors.muted, mb: 2 }}>
        Os avisos estão bloqueados nas configurações do navegador.
      </Typography>
    )
  }
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1.75, borderRadius: '16px', backgroundColor: colors.brandTint, mb: 2 }}>
      <NotificationsActiveIcon sx={{ color: colors.brand }} />
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1">Receba avisos no celular</Typography>
        <Typography variant="caption" sx={{ color: colors.muted }}>Mesmo com o app fechado.</Typography>
      </Box>
      <Button variant="contained" onClick={enable} disabled={busy}>Ativar</Button>
    </Box>
  )
}

function NotificationRow({ notification, onOpen }) {
  const style = TYPE_STYLE[notification.type] || { icon: NotificationsIcon, tone: 'neutral' }
  const Icon = style.icon
  const tone = TONES[style.tone]
  return (
    <ButtonBase
      onClick={() => onOpen(notification)}
      sx={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 1.5, p: 1.25, borderRadius: '16px', textAlign: 'left', justifyContent: 'flex-start', backgroundColor: notification.read ? 'transparent' : colors.ground }}
    >
      <Box sx={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: tone.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon sx={{ fontSize: 20, color: tone.color }} />
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: notification.read ? 600 : 800 }}>{notification.title}</Typography>
        {notification.body && <Typography variant="body2" sx={{ color: colors.muted }}>{notification.body}</Typography>}
        <Typography variant="caption" sx={{ color: colors.subtle }}>{formatTimeAgo(notification.createdAt)}</Typography>
      </Box>
      {!notification.read && <Box aria-label="Não lida" sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: colors.brand, mt: 0.75, flexShrink: 0 }} />}
    </ButtonBase>
  )
}

// Bell with the unread count; opens the notification center. onNavigate
// receives the tapped notification so the app can open the right screen.
export default function NotificationBell({ uid, onNavigate }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!uid) return
    return subscribeToNotifications(uid, setNotifications, () => {})
  }, [uid])

  const unread = notifications.filter((n) => !n.read).length
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const groups = [
    { label: 'Hoje', items: notifications.filter((n) => n.createdAt >= startOfToday) },
    { label: 'Anteriores', items: notifications.filter((n) => n.createdAt < startOfToday) },
  ].filter((g) => g.items.length > 0)

  const openNotification = (notification) => {
    if (!notification.read) markNotificationRead(notification.id).catch(() => {})
    setOpen(false)
    onNavigate?.(notification)
  }

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        aria-label={unread ? `Notificações, ${unread} não lidas` : 'Notificações'}
        sx={{ width: 44, height: 44, backgroundColor: colors.surface, border: `1px solid ${colors.line}` }}
      >
        <Badge badgeContent={unread} color="error" max={9}>
          <NotificationsIcon sx={{ color: colors.ink }} />
        </Badge>
      </IconButton>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Notificações">
        <PushPrompt uid={uid} />
        {unread > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1, mb: 1 }}>
            <Button size="small" onClick={() => markAllNotificationsRead(notifications).catch(() => {})}>Marcar todas como lidas</Button>
          </Box>
        )}
        <Box sx={{ overflowY: 'auto', mx: -1, px: 1, maxHeight: '60dvh' }}>
          {notifications.length === 0 && (
            <EmptyState icon={<NotificationsIcon />} title="Nada por aqui">Avisos sobre seus exames e seu plano aparecem aqui.</EmptyState>
          )}
          {groups.map((g) => (
            <Box key={g.label} sx={{ mb: 1.5 }}>
              <Typography variant="overline" sx={{ color: colors.muted, px: 1 }}>{g.label}</Typography>
              {g.items.map((n) => <NotificationRow key={n.id} notification={n} onOpen={openNotification} />)}
            </Box>
          ))}
        </Box>
      </BottomSheet>
    </>
  )
}
