import { useEffect, useState } from 'react'
import {
  Box, Dialog, DialogActions, DialogContent, DialogTitle,
  Button, TextField,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { PersonalList } from '../../types'

interface AddListDialogProps {
  open:    boolean
  onClose: () => void
  onAdd:   (list: PersonalList) => void
  userId:  string
  createList: (payload: {
    userId: string
    title: string
    emoji?: string
  }) => Promise<PersonalList>
}

export default function AddListDialog({ open, onClose, onAdd, userId, createList }: AddListDialogProps) {
  const { t } = useTranslation()

  const [title,      setTitle]      = useState('')
  const [emoji,      setEmoji]      = useState('')
  const [titleError, setTitleError] = useState(false)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setEmoji('')
      setTitleError(false)
    }
  }, [open])

  async function handleSubmit() {
    if (!title.trim()) { setTitleError(true); return }
    setLoading(true)
    try {
      const list = await createList({
        userId,
        title: title.trim(),
        emoji: emoji.trim() || undefined,
      })
      onAdd(list)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('list.new')}</DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Emoji */}
          <TextField
            label="Emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            fullWidth
            size="small"
            placeholder="📋"
            inputProps={{ maxLength: 2 }}
          />

          {/* Title */}
          <TextField
            label={t('list.title')}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
            error={titleError}
            helperText={titleError ? t('common.required', 'Required') : undefined}
            fullWidth
            autoFocus
            size="small"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} disabled={loading}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          sx={{ borderRadius: 2.5, fontWeight: 700 }}
        >
          {t('common.add')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
