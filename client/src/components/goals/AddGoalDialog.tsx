import { useEffect, useState } from 'react'
import {
  Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Button, TextField, Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { GoalCategory, GoalType } from '../../types'
import type { Goal } from '../../types'
import { goalsApi } from '../../api'

interface AddGoalDialogProps {
  open:    boolean
  onClose: () => void
  onAdd:   (goal: Goal) => void
  userId:  string
  createGoal: (payload: {
    userId: string
    title: string
    category: string
    goalType: string
    dueDate?: string
  }) => Promise<Goal>
  editGoal?: Goal
  onEdit?:   (goal: Goal) => void
}

export default function AddGoalDialog({ open, onClose, onAdd, onEdit, userId, createGoal, editGoal }: AddGoalDialogProps) {
  const { t } = useTranslation()
  const isEdit = !!editGoal

  const [title,      setTitle]      = useState('')
  const [category,   setCategory]   = useState<GoalCategory>(GoalCategory.Personal)
  const [goalType,   setGoalType]   = useState<GoalType>(GoalType.Finite)
  const [dueDate,    setDueDate]    = useState('')
  const [titleError, setTitleError] = useState(false)
  const [loading,    setLoading]    = useState(false)

  useEffect(() => {
    if (open && editGoal) {
      setTitle(editGoal.title)
      setCategory(editGoal.category)
      setGoalType(editGoal.goalType)
      setDueDate(editGoal.dueDate ?? '')
      setTitleError(false)
    } else if (!open) {
      setTitle('')
      setCategory(GoalCategory.Personal)
      setGoalType(GoalType.Finite)
      setDueDate('')
      setTitleError(false)
    }
  }, [open, editGoal])

  async function handleSubmit() {
    if (!title.trim()) { setTitleError(true); return }
    setLoading(true)
    try {
      if (isEdit && editGoal) {
        const updated = await goalsApi.update(editGoal.id, {
          title: title.trim(),
          category,
          goalType,
          dueDate: dueDate || undefined,
        })
        onEdit?.(updated)
      } else {
        const goal = await createGoal({
          userId,
          title: title.trim(),
          category,
          goalType,
          dueDate: dueDate || undefined,
        })
        onAdd(goal)
      }
    } finally {
      setLoading(false)
    }
  }

  const categories = Object.values(GoalCategory)
  const goalTypes  = Object.values(GoalType)

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? t('goal.edit', 'עריכת מטרה') : t('goal.new')}</DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Title */}
          <TextField
            label={t('goal.title')}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
            error={titleError}
            helperText={titleError ? t('common.required', 'Required') : undefined}
            fullWidth
            autoFocus
            size="small"
          />

          {/* Category */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              {t('goal.category')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {categories.map((c) => (
                <Chip
                  key={c}
                  label={t(`category.${c}`)}
                  onClick={() => setCategory(c)}
                  sx={{
                    fontWeight: 700,
                    bgcolor:   category === c ? 'primary.main' : 'transparent',
                    color:     category === c ? 'white' : 'text.primary',
                    border:    '1.5px solid',
                    borderColor: category === c ? 'primary.main' : 'divider',
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Goal Type */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              {t('goal.finite')} / {t('goal.ongoing')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {goalTypes.map((gt) => (
                <Chip
                  key={gt}
                  label={t(`goal.${gt}`)}
                  onClick={() => setGoalType(gt)}
                  sx={{
                    fontWeight: 700,
                    bgcolor:   goalType === gt ? 'primary.main' : 'transparent',
                    color:     goalType === gt ? 'white' : 'text.primary',
                    border:    '1.5px solid',
                    borderColor: goalType === gt ? 'primary.main' : 'divider',
                  }}
                />
              ))}
            </Box>
          </Box>

          {/* Due date — only for finite goals */}
          {goalType === GoalType.Finite && (
            <TextField
              label={t('task.dueDate')}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          )}
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
          {isEdit ? t('common.save', 'שמור') : t('common.add')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
