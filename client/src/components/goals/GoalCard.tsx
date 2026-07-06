import { Card, CardActionArea, Box, Typography, LinearProgress, Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { GoalType } from '../../types'
import type { Goal } from '../../types'
import GoalCategoryIcon from './GoalCategoryIcon'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import ShareRoundedIcon from '@mui/icons-material/ShareRounded'
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ShareDialog from '../ShareDialog'

interface Props {
  goal:       Goal
  onClick?:   () => void
  onEdit?:    (goal: Goal) => void
  onDelete?:  (id: string) => void
  onComplete?: (id: string, done: boolean) => void
}

export default function GoalCard({ goal, onClick, onEdit, onDelete, onComplete }: Props) {
  const { t, i18n } = useTranslation()
  const [shareOpen,   setShareOpen]   = useState(false)
  const [deleteOpen,  setDeleteOpen]  = useState(false)

  const isFinite = goal.goalType === GoalType.Finite

  const finiteProgress =
    goal.totalTasks > 0
      ? Math.round((goal.completedTasks / goal.totalTasks) * 100)
      : 0

  const weeklyProgress =
    (goal.weeklyTotal ?? 0) > 0
      ? Math.round(((goal.weeklyCompleted ?? 0) / (goal.weeklyTotal ?? 1)) * 100)
      : 0

  const formattedDueDate = goal.dueDate
    ? new Date(goal.dueDate).toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null

  return (
    <>
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: goal.isCompleted ? 'rgba(76,175,80,0.3)' : 'rgba(124,92,255,0.12)',
        boxShadow: goal.isCompleted ? '0 2px 10px rgba(76,175,80,0.08)' : '0 2px 10px rgba(124,92,255,0.07)',
        opacity: goal.isCompleted ? 0.82 : 1,
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: goal.isCompleted ? '0 4px 16px rgba(76,175,80,0.15)' : '0 4px 16px rgba(124,92,255,0.13)' },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          {/* Category icon */}
          <GoalCategoryIcon category={goal.category} />

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title + action buttons + type badge */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
                gap: 0.5,
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight={600}
                noWrap
                sx={{ flex: 1 }}
              >
                {goal.title}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                {onComplete && (
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onComplete(goal.id, !goal.isCompleted) }}
                    sx={{ p: 0.25 }}
                    title={goal.isCompleted ? t('goal.markIncomplete', 'בטל סיום') : t('goal.markComplete', 'סמן כהושלם')}
                  >
                    {goal.isCompleted
                      ? <CheckCircleRoundedIcon sx={{ fontSize: 15, color: '#4CAF50' }} />
                      : <CheckCircleOutlineRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />}
                  </IconButton>
                )}
                {onEdit && (
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(goal) }} sx={{ p: 0.25 }}>
                    <EditRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                  </IconButton>
                )}
                {onDelete && (
                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); setDeleteOpen(true) }} sx={{ p: 0.25 }}>
                    <DeleteRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                  </IconButton>
                )}
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setShareOpen(true) }} sx={{ p: 0.25 }}>
                  <ShareRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                </IconButton>
                <Chip
                  label={t(isFinite ? 'goal.finite' : 'goal.ongoing')}
                  size="small"
                  sx={{
                    bgcolor: isFinite ? '#E3F2FD' : '#EDE9FF',
                    color: isFinite ? '#1565C0' : '#5438CC',
                    fontWeight: 600,
                    fontSize: '0.68rem',
                    height: 20,
                    flexShrink: 0,
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              </Box>
            </Box>

            {/* ── Finite: overall progress ── */}
            {isFinite && (
              <>
                <LinearProgress
                  variant="determinate"
                  value={finiteProgress}
                  sx={{
                    borderRadius: 4,
                    height: 6,
                    bgcolor: '#EDE9FF',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'primary.main',
                      borderRadius: 4,
                    },
                  }}
                />
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    mt: 0.75,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t('goal.tasksCompleted', {
                      completed: goal.completedTasks,
                      total: goal.totalTasks,
                    })}
                  </Typography>
                  {formattedDueDate && (
                    <Typography variant="caption" color="text.secondary">
                      {t('goal.dueDate', { date: formattedDueDate })}
                    </Typography>
                  )}
                </Box>
              </>
            )}

            {/* ── Ongoing: weekly progress + today remaining ── */}
            {!isFinite && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 0.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {t('goal.weeklyProgress')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('goal.weeklyStats', {
                      completed: goal.weeklyCompleted ?? 0,
                      total: goal.weeklyTotal ?? 0,
                    })}
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={weeklyProgress}
                  sx={{
                    borderRadius: 4,
                    height: 6,
                    bgcolor: '#F3E5F5',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#7C5CFF',
                      borderRadius: 4,
                    },
                  }}
                />

                {(goal.todayRemaining ?? 0) > 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.75, display: 'block' }}
                  >
                    {t('goal.todayRemaining', { count: goal.todayRemaining })}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>
      </CardActionArea>

      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        resourceType="Goal"
        resourceId={goal.id}
        resourceTitle={goal.title}
      />
    </Card>

    {/* Delete confirmation dialog */}
    <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{t('goal.deleteConfirmTitle', 'מחיקת מטרה')}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          {t('goal.deleteConfirmText', { title: goal.title })}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button onClick={() => setDeleteOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>
          {t('common.cancel', 'ביטול')}
        </Button>
        <Button
          onClick={() => { setDeleteOpen(false); onDelete?.(goal.id) }}
          variant="contained"
          color="error"
          sx={{ borderRadius: 2 }}
        >
          {t('common.delete', 'מחק')}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  )
}
