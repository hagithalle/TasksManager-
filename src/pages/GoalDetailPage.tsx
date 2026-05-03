import {
  Box, Typography, LinearProgress, Chip, Divider,
  List, ListItem, ListItemText, ListItemIcon, Checkbox,
  Collapse, IconButton,
} from '@mui/material'
import ExpandMoreRoundedIcon  from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon  from '@mui/icons-material/ExpandLessRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { mockGoals } from '../data'
import { mockTasks } from '../data'
import { GoalType } from '../types'
import GoalCategoryIcon from '../components/goals/GoalCategoryIcon'

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()

  const goal  = mockGoals.find((g) => g.id === id)
  const tasks = mockTasks.filter((t) => t.goalId === id)

  // track which tasks have their subtask list open
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (!goal) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('common.noData')}</Typography>
      </Box>
    )
  }

  const isFinite = goal.goalType === GoalType.Finite

  const overallProgress =
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

  const toggle = (taskId: string) =>
    setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }))

  // priority colour dot
  const priorityColor: Record<string, string> = {
    low: '#4CAF50', medium: '#FF9800', high: '#F44336', critical: '#9C27B0',
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* ── Hero header ── */}
      <Box
        sx={{
          px: 2, pt: 3, pb: 2,
          background: 'linear-gradient(135deg, #EDE9FF 0%, #F3E5F5 100%)',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
          <GoalCategoryIcon category={goal.category} size={56} />

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
              {goal.title}
            </Typography>
            <Chip
              label={t(isFinite ? 'goal.finite' : 'goal.ongoing')}
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: isFinite ? '#E3F2FD' : '#EDE9FF',
                color:   isFinite ? '#1565C0' : '#5438CC',
                fontWeight: 600,
                fontSize: '0.68rem',
              }}
            />
          </Box>
        </Box>

        {/* Stats row */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: isFinite ? '1fr 1fr 1fr' : '1fr 1fr 1fr',
            gap: 1,
            mb: 2,
          }}
        >
          {/* Overall progress */}
          <Box
            sx={{
              bgcolor: 'white', borderRadius: 2, p: 1.5, textAlign: 'center',
              boxShadow: '0 1px 4px rgba(124,92,255,0.1)',
            }}
          >
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {overallProgress}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('goal.progress')}
            </Typography>
          </Box>

          {/* Completed tasks */}
          <Box
            sx={{
              bgcolor: 'white', borderRadius: 2, p: 1.5, textAlign: 'center',
              boxShadow: '0 1px 4px rgba(124,92,255,0.1)',
            }}
          >
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {goal.completedTasks}/{goal.totalTasks}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('goal.tasks')}
            </Typography>
          </Box>

          {/* Due date (Finite) or today remaining (Ongoing) */}
          <Box
            sx={{
              bgcolor: 'white', borderRadius: 2, p: 1.5, textAlign: 'center',
              boxShadow: '0 1px 4px rgba(124,92,255,0.1)',
            }}
          >
            {isFinite ? (
              <>
                <Typography variant="h6" fontWeight={700} color="primary.main" fontSize="0.95rem">
                  {formattedDueDate ?? '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('task.dueDate')}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h6" fontWeight={700} color="primary.main">
                  {goal.todayRemaining ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {t('goal.todayRemaining', { count: 0 }).replace(/\d+/, '').trim()}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* Progress bar */}
        {isFinite ? (
          <LinearProgress
            variant="determinate"
            value={overallProgress}
            sx={{
              borderRadius: 4, height: 8, bgcolor: 'rgba(124,92,255,0.15)',
              '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
            }}
          />
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {t('goal.weeklyProgress')} — {t('goal.weeklyStats', {
                completed: goal.weeklyCompleted ?? 0,
                total: goal.weeklyTotal ?? 0,
              })}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={weeklyProgress}
              sx={{
                borderRadius: 4, height: 8, bgcolor: 'rgba(124,92,255,0.15)',
                '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
              }}
            />
          </>
        )}
      </Box>

      {/* ── Task list ── */}
      <Box sx={{ px: 2, pt: 2 }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
          {t('goal.tasks')} ({tasks.length})
        </Typography>

        {tasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('common.noData')}
          </Typography>
        ) : (
          <List disablePadding>
            {tasks.map((task, index) => {
              const hasSubTasks = (task.subTasks?.length ?? 0) > 0
              const isOpen = expanded[task.id] ?? false

              return (
                <Box key={task.id}>
                  {index > 0 && <Divider />}

                  <ListItem
                    disablePadding
                    sx={{ py: 1, gap: 1 }}
                    secondaryAction={
                      hasSubTasks ? (
                        <IconButton size="small" onClick={() => toggle(task.id)} edge="end">
                          {isOpen
                            ? <ExpandLessRoundedIcon fontSize="small" />
                            : <ExpandMoreRoundedIcon fontSize="small" />}
                        </IconButton>
                      ) : undefined
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={task.isCompleted}
                        disableRipple
                        icon={<RadioButtonUncheckedRoundedIcon sx={{ color: 'text.disabled' }} />}
                        checkedIcon={<CheckCircleRoundedIcon sx={{ color: 'primary.main' }} />}
                        size="small"
                      />
                    </ListItemIcon>

                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              bgcolor: priorityColor[task.priority] ?? '#999',
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              textDecoration: task.isCompleted ? 'line-through' : 'none',
                              color: task.isCompleted ? 'text.disabled' : 'text.primary',
                            }}
                          >
                            {task.title}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        task.durationMinutes
                          ? `${task.durationMinutes} \'`
                          : undefined
                      }
                    />
                  </ListItem>

                  {/* Sub-tasks */}
                  {hasSubTasks && (
                    <Collapse in={isOpen}>
                      <List disablePadding sx={{ pl: 5, pb: 0.5 }}>
                        {task.subTasks!.map((sub) => (
                          <ListItem key={sub.id} disablePadding sx={{ py: 0.25 }}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <Checkbox
                                edge="start"
                                checked={sub.isCompleted}
                                disableRipple
                                icon={<RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                                checkedIcon={<CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />}
                                size="small"
                              />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography
                                  variant="caption"
                                  sx={{
                                    textDecoration: sub.isCompleted ? 'line-through' : 'none',
                                    color: sub.isCompleted ? 'text.disabled' : 'text.secondary',
                                  }}
                                >
                                  {sub.title}
                                </Typography>
                              }
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                  )}
                </Box>
              )
            })}
          </List>
        )}
      </Box>
    </Box>
  )
}

