import { useEffect, useState } from 'react'
import {
  Box, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Button, TextField, Typography, FormControlLabel, Switch,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import { GoalCategory, GoalType, Priority, ExecutionType } from '../../types'
import type { Goal } from '../../types'
import { goalsApi, tasksApi } from '../../api'
import { useAuth } from '../../contexts/AuthContext'

const DEFAULT_CATEGORIES: GoalCategory[] = Object.values(GoalCategory) as GoalCategory[]

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
  const { user } = useAuth()
  const isEdit = !!editGoal

  const [title,        setTitle]        = useState('')
  const [category,     setCategory]     = useState<string>(GoalCategory.Personal)
  const [customCat,    setCustomCat]    = useState('')
  const [showCustom,   setShowCustom]   = useState(false)
  const [goalType,     setGoalType]     = useState<GoalType>(GoalType.Finite)
  const [dueDate,      setDueDate]      = useState('')
  const [createTask,   setCreateTask]   = useState(false)
  const [titleError,   setTitleError]   = useState(false)
  const [loading,      setLoading]      = useState(false)

  useEffect(() => {
    if (open && editGoal) {
      setTitle(editGoal.title)
      const known = DEFAULT_CATEGORIES.includes(editGoal.category as GoalCategory)
      setCategory(editGoal.category)
      setShowCustom(!known)
      setCustomCat(known ? '' : editGoal.category)
      setGoalType(editGoal.goalType)
      setDueDate(editGoal.dueDate ?? '')
      setCreateTask(false)
      setTitleError(false)
    } else if (!open) {
      setTitle('')
      setCategory(GoalCategory.Personal)
      setCustomCat('')
      setShowCustom(false)
      setGoalType(GoalType.Finite)
      setDueDate('')
      setCreateTask(false)
      setTitleError(false)
    }
  }, [open, editGoal])

  function selectCategory(c: string) {
    setCategory(c)
    setShowCustom(false)
    setCustomCat('')
  }

  function selectCustom() {
    setShowCustom(true)
    setCategory('')
  }

  const finalCategory = showCustom
    ? (customCat.trim().toLowerCase() || 'personal')
    : category

  async function handleSubmit() {
    if (!title.trim()) { setTitleError(true); return }
    setLoading(true)
    try {
      if (isEdit && editGoal) {
        const updated = await goalsApi.update(editGoal.id, {
          title: title.trim(),
          category: finalCategory,
          goalType,
          dueDate: dueDate || undefined,
        })
        onEdit?.(updated)
      } else {
        const goal = await createGoal({
          userId,
          title: title.trim(),
          category: finalCategory,
          goalType,
          dueDate: dueDate || undefined,
        })
        // Optionally create a linked task
        if (createTask && user) {
          await tasksApi.create({
            userId: user.id,
            title: title.trim(),
            priority: Priority.Medium,
            executionType: ExecutionType.Short,
            goalId: goal.id,
            dueDate: dueDate || undefined,
          })
        }
        onAdd(goal)
      }
    } finally {
      setLoading(false)
    }
  }

  const goalTypes = Object.values(GoalType) as GoalType[]

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
              {DEFAULT_CATEGORIES.map((c) => (
                <Chip
                  key={c}
                  label={t(`category.${c}`, c)}
                  onClick={() => selectCategory(c)}
                  sx={{
                    fontWeight: 700,
                    bgcolor:   (!showCustom && category === c) ? 'primary.main' : 'transparent',
                    color:     (!showCustom && category === c) ? 'white' : 'text.primary',
                    border:    '1.5px solid',
                    borderColor: (!showCustom && category === c) ? 'primary.main' : 'divider',
                  }}
                />
              ))}
              {/* Custom category chip */}
              <Chip
                label={t('goal.customCategory', 'אחר…')}
                onClick={selectCustom}
                sx={{
                  fontWeight: 700,
                  bgcolor:   showCustom ? 'secondary.main' : 'transparent',
                  color:     showCustom ? 'white' : 'text.secondary',
                  border:    '1.5px dashed',
                  borderColor: showCustom ? 'secondary.main' : 'divider',
                }}
              />
            </Box>
            {showCustom && (
              <TextField
                size="small"
                placeholder={t('goal.customCategory', 'קטגוריה מותאמת...')}
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                sx={{ mt: 1, width: '100%' }}
              />
            )}
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

          {/* Also create a task — only when adding new goal */}
          {!isEdit && (
            <FormControlLabel
              control={
                <Switch
                  checked={createTask}
                  onChange={(e) => setCreateTask(e.target.checked)}
                  color="primary"
                />
              }
              label={t('goal.createTask', 'צור גם משימה מהמטרה')}
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

