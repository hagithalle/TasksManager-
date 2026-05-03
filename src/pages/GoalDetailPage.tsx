import {
  Box, Typography, LinearProgress, Chip, Divider,
  List, ListItem, ListItemText, ListItemIcon, Checkbox,
  Collapse, IconButton, Stack,
} from '@mui/material'
import ExpandMoreRoundedIcon           from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon           from '@mui/icons-material/ExpandLessRounded'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { mockGoals, mockTasks } from '../data'
import { GoalType, Priority } from '../types'
import type { TaskItem } from '../types'
import GoalCategoryIcon from '../components/goals/GoalCategoryIcon'

// ג”€ג”€ג”€ filter types ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
type Filter = 'all' | 'today' | 'urgent' | 'completed'

const TODAY = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'

function applyFilter(tasks: TaskItem[], filter: Filter): TaskItem[] {
  switch (filter) {
    case 'today':
      return tasks.filter((t) => !t.isCompleted && t.dueDate?.startsWith(TODAY))
    case 'urgent':
      return tasks.filter(
        (t) => !t.isCompleted && (t.priority === Priority.Critical || t.priority === Priority.High),
      )
    case 'completed':
      return tasks.filter((t) => t.isCompleted)
    default:
      return tasks
  }
}

// ג”€ג”€ג”€ priority colour dot ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
const PRIORITY_COLOR: Record<string, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
  critical: '#9C27B0',
}

// ג”€ג”€ג”€ component ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()

  const goal      = mockGoals.find((g) => g.id === id)
  const allTasks  = mockTasks.filter((tk) => tk.goalId === id)

  const [filter,   setFilter]   = useState<Filter>('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  if (!goal) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{t('common.noData')}</Typography>
      </Box>
    )
  }

  const isFinite     = goal.goalType === GoalType.Finite
  const overallPct   = goal.totalTasks > 0
    ? Math.round((goal.completedTasks / goal.totalTasks) * 100)
    : 0
  const weeklyPct    = (goal.weeklyTotal ?? 0) > 0
    ? Math.round(((goal.weeklyCompleted ?? 0) / (goal.weeklyTotal ?? 1)) * 100)
    : 0
  const formattedDue = goal.dueDate
    ? new Date(goal.dueDate).toLocaleDateString(i18n.language, {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null

  const visibleTasks = applyFilter(allTasks, filter)

  const toggleExpand = (taskId: string) =>
    setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }))

  const filters: Filter[] = ['all', 'today', 'urgent', 'completed']

  return (
    <Box sx={{ pb: 4 }}>

      {/* ג”€ג”€ Hero header ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */}
      <Box
        sx={{
          px: 2, pt: 3, pb: 2.5,
          background: 'linear-gradient(135deg, #EDE9FF 0%, #F3E5F5 100%)',
        }}
      >
        {/* Title row */}
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2.5 }}>
          <GoalCategoryIcon category={goal.category} size={56} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700} lineHeight={1.25}>
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

        {/* Stat cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 1,
            mb: 2,
          }}
        >
          {/* % progress */}
          <Box sx={statCardSx}>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {overallPct}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('goal.progress')}
            </Typography>
          </Box>

          {/* tasks X/Y */}
          <Box sx={statCardSx}>
            <Typography variant="h6" fontWeight={700} color="primary.main">
              {goal.completedTasks}/{goal.totalTasks}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('goal.tasks')}
            </Typography>
          </Box>

          {/* due date OR today remaining */}
          <Box sx={statCardSx}>
            {isFinite ? (
              <>
                <Typography variant="body2" fontWeight={700} color="primary.main">
                  {formattedDue ?? 'ג€”'}
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
                <Typography variant="caption" color="text.secondary">
                  {t('goal.todayRemaining', { count: goal.todayRemaining ?? 0 })
                    .replace(/\d+/, '')
                    .trim()}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* Progress bar */}
        {isFinite ? (
          <LinearProgress
            variant="determinate"
            value={overallPct}
            sx={progressBarSx}
          />
        ) : (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              {t('goal.weeklyProgress')} ג€” {t('goal.weeklyStats', {
                completed: goal.weeklyCompleted ?? 0,
                total:     goal.weeklyTotal ?? 0,
              })}
            </Typography>
            <LinearProgress variant="determinate" value={weeklyPct} sx={progressBarSx} />
          </>
        )}
      </Box>

      {/* ג”€ג”€ Filter chips ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {filters.map((f) => (
            <Chip
              key={f}
              label={t(`task.filter.${f}`)}
              onClick={() => setFilter(f)}
              variant={filter === f ? 'filled' : 'outlined'}
              size="small"
              sx={{
                fontWeight: filter === f ? 700 : 400,
                bgcolor:    filter === f ? 'primary.main' : 'transparent',
                color:      filter === f ? 'white' : 'text.secondary',
                borderColor: filter === f ? 'primary.main' : 'divider',
                '&:hover': {
                  bgcolor: filter === f ? 'primary.dark' : 'action.hover',
                },
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* ג”€ג”€ Task list ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */}
      <Box sx={{ px: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={700}
          sx={{ letterSpacing: 0.5, textTransform: 'uppercase', mb: 1, display: 'block' }}
        >
          {t('goal.tasks')} ({visibleTasks.length})
        </Typography>

        {visibleTasks.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
            {t('common.noData')}
          </Typography>
        ) : (
          <List disablePadding>
            {visibleTasks.map((task, index) => {
              const hasSubTasks = (task.subTasks?.length ?? 0) > 0
              const isOpen      = expanded[task.id] ?? false

              return (
                <Box key={task.id}>
                  {index > 0 && <Divider />}

                  <ListItem
                    disablePadding
                    sx={{ py: 1.25, alignItems: 'flex-start' }}
                    secondaryAction={
                      hasSubTasks ? (
                        <IconButton
                          size="small"
                          edge="end"
                          onClick={() => toggleExpand(task.id)}
                          sx={{ mt: 0.5 }}
                        >
                          {isOpen
                            ? <ExpandLessRoundedIcon fontSize="small" />
                            : <ExpandMoreRoundedIcon fontSize="small" />}
                        </IconButton>
                      ) : undefined
                    }
                  >
                    {/* Checkbox */}
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                      <Checkbox
                        edge="start"
                        checked={task.isCompleted}
                        disableRipple
                        icon={<RadioButtonUncheckedRoundedIcon sx={{ color: 'text.disabled' }} />}
                        checkedIcon={<CheckCircleRoundedIcon sx={{ color: 'primary.main' }} />}
                        size="small"
                      />
                    </ListItemIcon>

                    {/* Title + meta */}
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {/* priority dot */}
                          <Box
                            sx={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              bgcolor: PRIORITY_COLOR[task.priority] ?? '#999',
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              textDecoration: task.isCompleted ? 'line-through' : 'none',
                              color:          task.isCompleted ? 'text.disabled' : 'text.primary',
                              fontWeight: 500,
                            }}
                          >
                            {task.title}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box
                          component="span"
                          sx={{ display: 'flex', gap: 1, mt: 0.25, flexWrap: 'wrap' }}
                        >
                          {task.dueDate && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              {t('task.dueDate')}: {new Date(task.dueDate).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' })}
                            </Typography>
                          )}
                          {task.durationMinutes && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              {task.durationMinutes}&apos;
                            </Typography>
                          )}
                          {hasSubTasks && (
                            <Typography component="span" variant="caption" color="text.secondary">
                              {t('task.subtasks')}: {task.subTasks!.filter((s) => s.isCompleted).length}/{task.subTasks!.length}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>

                  {/* Sub-tasks collapse */}
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
                                    color:          sub.isCompleted ? 'text.disabled' : 'text.secondary',
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

// ג”€ג”€ג”€ shared sx ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€
const statCardSx = {
  bgcolor: 'white',
  borderRadius: 2,
  p: 1.5,
  textAlign: 'center',
  boxShadow: '0 1px 4px rgba(124,92,255,0.10)',
} as const

const progressBarSx = {
  borderRadius: 4,
  height: 8,
  bgcolor: 'rgba(124,92,255,0.15)',
  '& .MuiLinearProgress-bar': { bgcolor: 'primary.main', borderRadius: 4 },
} as const
