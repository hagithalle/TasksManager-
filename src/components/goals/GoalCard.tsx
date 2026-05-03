import { Card, CardActionArea, Box, Typography, LinearProgress, Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { GoalType } from '../../types'
import type { Goal } from '../../types'
import GoalCategoryIcon from './GoalCategoryIcon'

interface Props {
  goal: Goal
  onClick?: () => void
}

export default function GoalCard({ goal, onClick }: Props) {
  const { t, i18n } = useTranslation()

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
    <Card
      sx={{
        borderRadius: 3,
        boxShadow: '0 2px 12px rgba(124,92,255,0.08)',
        border: '1px solid rgba(124,92,255,0.08)',
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          {/* Category icon */}
          <GoalCategoryIcon category={goal.category} />

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title + type badge */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1,
                gap: 1,
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
    </Card>
  )
}
