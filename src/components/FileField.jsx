import { useRef } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import AttachFileIcon from '@mui/icons-material/AttachFileRounded'
import CloseIcon from '@mui/icons-material/CloseRounded'
import { colors } from '../theme'
import { validateFile, SUPPORTED_TYPES } from './fileRules'

function formatSize(bytes) {
  return bytes > 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB` : `${Math.round(bytes / 1024)} KB`
}

// A file chip once chosen; a dashed "attach" button before.
export default function FileField({ file, onChange, onError, label, hint, disabled }) {
  const input = useRef(null)

  const pick = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const problem = validateFile(f)
    if (problem) {
      onError(problem)
      return
    }
    onError('')
    onChange(f)
  }

  return (
    <>
      <input ref={input} type="file" accept={SUPPORTED_TYPES.join(',')} hidden onChange={pick} />
      {file ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '16px', backgroundColor: colors.ground }}>
          <Box sx={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: colors.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 800, color: file.type === 'application/pdf' ? colors.alert : colors.info, flexShrink: 0 }}>
            {file.type === 'application/pdf' ? 'PDF' : 'IMG'}
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>{file.name}</Typography>
            <Typography variant="caption" sx={{ color: colors.muted }}>{formatSize(file.size)}{hint ? ` · ${hint}` : ''}</Typography>
          </Box>
          <IconButton onClick={() => onChange(null)} disabled={disabled} aria-label="Remover arquivo"><CloseIcon /></IconButton>
        </Box>
      ) : (
        <ButtonBase onClick={() => input.current?.click()} disabled={disabled} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '16px', border: `1px dashed ${colors.lineStrong}`, justifyContent: 'flex-start', textAlign: 'left' }}>
          <AttachFileIcon sx={{ color: colors.brand }} />
          <Box>
            <Typography variant="subtitle1">{label}</Typography>
            <Typography variant="caption" sx={{ color: colors.muted }}>PDF, PNG ou JPG · até 14 MB</Typography>
          </Box>
        </ButtonBase>
      )}
    </>
  )
}
