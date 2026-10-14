import { useCallback, useState } from 'react'
import Snackbar from '@mui/material/Snackbar'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import CheckIcon from '@mui/icons-material/CheckRounded'
import { colors } from '../theme'
import { ToastContext } from './toastContext'

// App-wide confirmation messages ("Exame enviado"), shown above the
// bottom nav. useToast()(message, { action: { label, onClick } }).
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const show = useCallback((message, options = {}) => {
    setToast({ message, action: options.action, key: Date.now() })
  }, [])

  const close = () => setToast(null)

  return (
    <ToastContext.Provider value={show}>
      {children}
      <Snackbar
        key={toast?.key}
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={(_, reason) => reason !== 'clickaway' && close()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 100, sm: 100 } }}
      >
        <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pl: 2, pr: toast?.action ? 0.75 : 2, py: 1, minHeight: 48, borderRadius: '16px', backgroundColor: colors.ink, color: '#FFFFFF', boxShadow: '0 10px 30px rgba(36,28,48,0.3)', maxWidth: 440 }}>
          <CheckIcon sx={{ fontSize: 20, color: '#9FE0BF' }} />
          <Box sx={{ fontSize: '0.875rem', fontWeight: 600, flexGrow: 1 }}>{toast?.message}</Box>
          {toast?.action && (
            <ButtonBase
              onClick={() => { toast.action.onClick(); close() }}
              sx={{ px: 1.5, minHeight: 36, borderRadius: '10px', fontSize: '0.8125rem', fontWeight: 800, color: '#D9C6EC' }}
            >
              {toast.action.label}
            </ButtonBase>
          )}
        </Box>
      </Snackbar>
    </ToastContext.Provider>
  )
}
