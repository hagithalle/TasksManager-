import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Stack, Chip, Checkbox,
  CircularProgress, Alert, Divider,
} from '@mui/material'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { useTranslation } from 'react-i18next'
import { listsApi, type CookingSuggestion } from '../../api/listsApi'
import { aiApi, type ShabbatPlanDish } from '../../api/aiApi'

const SLOT_ORDER = ['fridaydinner', 'saturdaymorning', 'additions', 'thirdmeal']
const SLOT_EMOJIS: Record<string, string> = {
  fridaydinner:    '🕯️',
  saturdaymorning: '☀️',
  additions:       '🥖',
  thirdmeal:       '🌅',
}

interface Props {
  open:        boolean
  listId:      string
  suggestions: CookingSuggestion[]
  onClose:     () => void
  onDone:      () => void
}

export default function ShabbatPlannerDialog({ open, listId, suggestions, onClose, onDone }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('he') ? 'he' : 'en'

  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [message,   setMessage]   = useState('')
  const [dishes,    setDishes]    = useState<ShabbatPlanDish[]>([])
  const [selected,  setSelected]  = useState<Set<number>>(new Set())
  const [saving,    setSaving]    = useState(false)
  const [done,      setDone]      = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setDone(false)
    try {
      const history = suggestions.map(s => ({
        title:       s.title,
        timesCooked: s.timesCooked,
        ingredients: s.ingredients,
        tags:        s.tags,
        lastCooked:  s.lastCooked,
      }))
      const result = await aiApi.planShabbat(history, lang)
      setMessage(result.message)
      setDishes(result.dishes)
      setSelected(new Set(result.dishes.map((_, i) => i)))
    } catch {
      setError(t('cooking.shabbatPlanError', 'שגיאה בתכנון — נסי שוב'))
    } finally {
      setLoading(false)
    }
  }

  function toggleDish(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  async function handleAddToList() {
    setSaving(true)
    try {
      const toAdd = dishes.filter((_, i) => selected.has(i))
      await Promise.all(toAdd.map(d =>
        listsApi.addCookingItem(listId, {
          title:    d.title,
          mealSlot: d.mealSlot,
          tags:     d.tags,
          notes:    d.notes ?? undefined,
        })
      ))
      onDone()
      setDone(true)
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setMessage('')
    setDishes([])
    setSelected(new Set())
    setError(null)
    setDone(false)
    onClose()
  }

  // Group dishes by meal slot
  const grouped = SLOT_ORDER.map(slot => ({
    slot,
    emoji:  SLOT_EMOJIS[slot] ?? '📋',
    label:  t(`mealSlot.${slot}`, slot),
    dishes: dishes.map((d, i) => ({ d, i })).filter(({ d }) => d.mealSlot === slot),
  })).filter(g => g.dishes.length > 0)

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesomeRoundedIcon color="secondary" />
        {t('cooking.shabbatPlanner', 'תכנון שבת עם AI')}
      </DialogTitle>

      <DialogContent>
        {dishes.length === 0 && !loading && !done && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {t('cooking.shabbatPlannerDesc',
                'הסוכן יתכנן תפריט שלם לשבת — ערב שבת, בוקר שבת, תוספות וסעודה שלישית — בהתבסס על המאגר האישי שלך.'
              )}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRoundedIcon />}
              onClick={handleGenerate}
              disabled={loading}
              size="large"
            >
              {t('cooking.planNow', 'תכנן עכשיו')}
            </Button>
          </Box>
        )}

        {loading && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2 }} color="text.secondary">
              {t('cooking.planning', 'מתכנן...')}
            </Typography>
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {done && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('cooking.dishesAdded', 'המנות נוספו לרשימה!')}
          </Alert>
        )}

        {dishes.length > 0 && !loading && (
          <>
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              {message}
            </Typography>

            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {t('cooking.selectDishes', 'בחרי את המנות להוספה')}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={() => setSelected(new Set(dishes.map((_, i) => i)))}>
                  {t('common.selectAll', 'בחר הכל')}
                </Button>
                <Button size="small" onClick={() => setSelected(new Set())}>
                  {t('common.deselectAll', 'נקה')}
                </Button>
              </Stack>
            </Stack>

            <Stack spacing={2.5}>
              {grouped.map(({ slot, emoji, label, dishes: slotDishes }) => (
                <Box key={slot}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.75 }}>
                    {emoji} {label}
                  </Typography>
                  <Stack spacing={0.5}>
                    {slotDishes.map(({ d, i }) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex', alignItems: 'flex-start',
                          p: 1, borderRadius: 1.5,
                          bgcolor: selected.has(i) ? 'action.selected' : 'transparent',
                          border: '1px solid',
                          borderColor: selected.has(i) ? 'primary.light' : 'divider',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleDish(i)}
                      >
                        <Checkbox
                          checked={selected.has(i)}
                          size="small"
                          sx={{ p: 0, mr: 1 }}
                          onClick={e => e.stopPropagation()}
                          onChange={() => toggleDish(i)}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="body2" fontWeight={600}>{d.title}</Typography>
                            {d.isNew && (
                              <Chip
                                label={t('cooking.newSuggestion', 'חדש')}
                                size="small"
                                color="secondary"
                                variant="outlined"
                                sx={{ height: 16, fontSize: '0.6rem' }}
                              />
                            )}
                          </Stack>
                          {d.notes && (
                            <Typography variant="caption" color="text.secondary">{d.notes}</Typography>
                          )}
                          {d.tags.length > 0 && (
                            <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.25 }}>
                              {d.tags.map(tag => (
                                <Chip key={tag} label={tag} size="small" variant="outlined"
                                  sx={{ height: 14, fontSize: '0.58rem' }} />
                              ))}
                            </Stack>
                          )}
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                  <Divider sx={{ mt: 1.5 }} />
                </Box>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={handleClose}>{t('common.close', 'סגור')}</Button>
        {dishes.length > 0 && !done && (
          <Button
            variant="contained"
            onClick={handleAddToList}
            disabled={saving || selected.size === 0}
          >
            {saving
              ? t('cooking.adding', 'מוסיף...')
              : t('cooking.addSelected', `הוסף ${selected.size} מנות`, { count: selected.size })}
          </Button>
        )}
        {(dishes.length === 0 || done) && !loading && (
          <Button
            variant="outlined"
            startIcon={<AutoAwesomeRoundedIcon />}
            onClick={handleGenerate}
            disabled={loading}
          >
            {done ? t('cooking.replan', 'תכנן מחדש') : t('cooking.planNow', 'תכנן עכשיו')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
