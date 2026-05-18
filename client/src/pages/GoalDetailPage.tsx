import {
  Box, Typography, LinearProgress, Chip, Divider,
  List, ListItem, ListItemText, ListItemIcon, Checkbox,
  Collapse, IconButton, Fab, CircularProgress, Alert,
} from '@mui/material'
import ExpandMoreRoundedIcon           from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon           from '@mui/icons-material/ExpandLessRounded'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import AddRoundedIcon                  from '@mui/icons-material/AddRounded'
import EditRoundedIcon                 from '@mui/icons-material/EditRounded'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCallback, useEffect, useState } from 'react'
import { goalsApi, tasksApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { GoalType } from '../types'
import type { Goal, TaskItem } from '../types'
import GoalCategoryIcon from '../components/goals/GoalCategoryIcon'
import AddTaskDialog    from '../components/tasks/AddTaskDialog'
import AddGoalDialog    from '../components/goals/AddGoalDialog'
import { Filter, applyFilter, PRIORITY_COLOR } from '../utils'

// ─── component ────────────────────────────────────────────────────────────────
export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const [goal,       setGoal]       = useState<Goal | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [filter,     setFilter]     = useState<Filter>('all')
  const [expanded,   setExpanded]   = useState<Record<string, boolean>>({})
  const [localTasks, setLocalTasks] = useState<TaskItem[]>([])
  const [addOpen,    setAddOpen]    = useState(false)
  const [allGoals,   setAllGoals]   = useState<Goal[]>([])
  const [editTask,   setEditTask]   = useState<TaskItem | null>(null)
  const [editGoalOpen, setEditGoalOpen] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      goalsApi.getById(id),
      tasksApi.getByGoal(id),
      user ? goalsApi.getByUser(user.id) : Promise.resolve([]),
    ])
      .then(([g, tasks, goals]) => {
        setGoal(g)
        setLocalTasks(tasks)
        setAllGoals(goals)
      })
      .catch(() => setError(t('error.loadFailed', 'Failed to load')))
      .finally(() => setLoading(false))
  }, [id, user, t])

  const toggleTaskComplete = useCallback(async (taskId: string) => {
    const task = localTasks.find((t) => t.id === taskId)
    if (!task) return
    const next = !task.isCompleted
    setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, isCompleted: next } : t))
    try {
      await tasksApi.update(taskId, { isCompleted: next })
    } catch {
      setLocalTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, isCompleted: task.isCompleted } : t))
    }
  }, [localTasks])

  const toggleSubComplete = useCallback(async (taskId: string, subId: string) => {
    const task = localTasks.find((t) => t.id === taskId)
    const sub  = task?.subTasks?.find((s) => s.id === subId)
    if (!sub) return
    const next = !sub.isCompleted
    setLocalTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t
      return { ...t, subTasks: (t.subTasks ?? []).map((s) => s.id === subId ? { ...s, isCompleted: next } : s) }
    }))
    try {
      await tasksApi.updateSubTask(subId, { isCompleted: next })
    } catch {
      setLocalTasks((prev) => prev.map((t) => {
        if (t.id !== taskId) return t
        return { ...t, subTasks: (t.subTasks ?? []).map((s) => s.id === subId ? { ...s, isCompleted: sub.isCompleted } : s) }
      }))
    }
  }, [localTasks])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !goal) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        {error
          ? <Alert severity="error">{error}</Alert>
          : <Typography color="text.secondary">{t('common.noData')}</Typography>
        }
      </Box>
    )
  }

  const isFinite     = goal.goalType === GoalType.Finite
  const completedCount = localTasks.filter((t) => t.isCompleted).length
  const totalCount     = localTasks.length
  const overallPct   = totalCount > 0
    ? Math.round((completedCount / totalCount) * 100)
    : 0
  const weeklyPct    = (goal.weeklyTotal ?? 0) > 0
    ? Math.round(((goal.weeklyCompleted ?? 0) / (goal.weeklyTotal ?? 1)) * 100)
    : 0
  const formattedDue = goal.dueDate
    ? new Date(goal.dueDate).toLocaleDateString(i18n.language, {
        day: '2-digit', month: '2-digit', year: 'numeric',
      })
    : null

  const visibleTasks = applyFilter(localTasks, filter)

  const toggleExpand = (taskId: string) =>
    setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }))

  const filters: Filter[] = ['all', 'today', 'urgent', 'completed']

  return (
    <>
    <Box sx={{ pb: 10 }}>

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
          <IconButton size="small" onClick={() => setEditGoalOpen(true)} sx={{ alignSelf: 'flex-start' }}>
            <EditRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
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
              {completedCount}/{totalCount}
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
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
        </Box>
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
                  >
                    {/* Checkbox */}
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                      <Checkbox
                        edge="start"
                        checked={task.isCompleted}
                        onChange={() => toggleTaskComplete(task.id)}
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
                              flex: 1,
                            }}
                          >
                            {task.title}
                          </Typography>
                          {/* Action buttons inline */}
                          <Box sx={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                            <IconButton size="small" onClick={() => setEditTask(task)} sx={{ p: 0.25 }}>
                              <EditRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                            </IconButton>
                            {hasSubTasks && (
                              <IconButton size="small" onClick={() => toggleExpand(task.id)} sx={{ p: 0.25 }}>
                                {isOpen
                                  ? <ExpandLessRoundedIcon sx={{ fontSize: 15 }} />
                                  : <ExpandMoreRoundedIcon sx={{ fontSize: 15 }} />}
                              </IconButton>
                            )}
                          </Box>
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
                              {task.durationMinutes}{t('task.minutesShort')}
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
                                onChange={() => toggleSubComplete(task.id, sub.id)}
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

      {/* ── FAB ── */}
      <Fab
        color="primary"
        variant="extended"
        aria-label={t('task.new')}
        onClick={() => setAddOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 80, sm: 24 },
          right:  { xs: 16, sm: 24 },
          left: 'auto',
          boxShadow: '0 4px 16px rgba(124,92,255,0.4)',
          gap: 0.75,
        }}
      >
        <AddRoundedIcon />
        {t('task.new')}
      </Fab>

      <AddTaskDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={(task) => { setLocalTasks((prev) => [task, ...prev]); setAddOpen(false) }}
        goals={allGoals}
        userId={user?.id ?? ''}
        defaultGoalId={id}
      />

      <AddTaskDialog
        open={!!editTask}
        onClose={() => setEditTask(null)}
        onAdd={() => {}}
        onEdit={(updated) => {
          setLocalTasks((prev) => prev.map((t) => t.id === updated.id ? updated : t))
          setEditTask(null)
        }}
        editTask={editTask ?? undefined}
        goals={allGoals}
        userId={user?.id ?? ''}
      />

      <AddGoalDialog
        open={editGoalOpen}
        onClose={() => setEditGoalOpen(false)}
        onAdd={() => {}}
        onEdit={(updated) => { setGoal(updated); setEditGoalOpen(false) }}
        editGoal={goal ?? undefined}
        userId={user?.id ?? ''}
        createGoal={goalsApi.create}
      />
    </>
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
