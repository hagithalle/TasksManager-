import { useEffect, useState } from 'react'
import {
  Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Button, TextField, Typography, ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { PersonalList } from '../../types'
import { ListType, CookingMode } from '../../types/enums'

const LIST_TYPE_OPTIONS: { type: ListType; emoji: string }[] = [
  { type: ListType.Checklist, emoji: '✅' },
  { type: ListType.Shopping,  emoji: '🛒' },
  { type: ListType.Notes,     emoji: '📝' },
  { type: ListType.Ideas,     emoji: '💡' },
  { type: ListType.Equipment, emoji: '🎒' },
  { type: ListType.CookingPlan, emoji: '🍳' },
]

interface AddListDialogProps {
  open:    boolean
  onClose: () => void
  onAdd:   (list: PersonalList) => void
  userId:  string
  createList: (payload: {
    userId: string
    title: string
    emoji?: string
    listType?: string
    cookingMode?: string
  }) => Promise<PersonalList>
}

export default function AddListDialog({ open, onClose, onAdd, userId, createList }: AddListDialogProps) {
  const { t } = useTranslation()

  const [title,       setTitle]       = useState('')
  const [emoji,       setEmoji]       = useState('')
  const [listType,    setListType]    = useState<ListType>(ListType.Checklist)
  const [cookingMode, setCookingMode] = useState<CookingMode>(CookingMode.Regular)
  const [titleError,  setTitleError]  = useState(false)
  const [loading,     setLoading]     = useState(false)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setEmoji('')
      setListType(ListType.Checklist)
      setCookingMode(CookingMode.Regular)
      setTitleError(false)
    }
  }, [open])

  async function handleSubmit() {
    if (!title.trim()) { setTitleError(true); return }
    setLoading(true)
    try {
      const list = await createList({
        userId,
        title:    title.trim(),
        emoji:    emoji.trim() || undefined,
        listType,
        cookingMode: listType === ListType.CookingPlan ? cookingMode : undefined,
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

          {/* List type chips */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 0.75, display: 'block' }}>
              {t('list.type')}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {LIST_TYPE_OPTIONS.map(({ type, emoji: icon }) => (
                <Chip
                  key={type}
                  label={`${icon} ${t(`listType.${type}`)}`}
                  onClick={() => setListType(type)}
                  variant={listType === type ? 'filled' : 'outlined'}
                  color={listType === type ? 'primary' : 'default'}
                  size="small"
                  sx={{ fontWeight: listType === type ? 700 : 400 }}
                />
              ))}
            </Box>
          </Box>

          {/* Cooking mode (only for CookingPlan) */}
          {listType === ListType.CookingPlan && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 0.75, display: 'block' }}>
                {t('cookingMode.label', 'סוג תכנון')}
              </Typography>
              <ToggleButtonGroup
                value={cookingMode}
                exclusive
                onChange={(_, v) => v && setCookingMode(v)}
                size="small"
              >
                <ToggleButton value={CookingMode.Regular} sx={{ fontWeight: 600 }}>
                  {t('cookingMode.regular', 'ימי שבוע')}
                </ToggleButton>
                <ToggleButton value={CookingMode.Shabbat} sx={{ fontWeight: 600 }}>
                  {'🕯️ ' + t('cookingMode.shabbat', 'שבת')}
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

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