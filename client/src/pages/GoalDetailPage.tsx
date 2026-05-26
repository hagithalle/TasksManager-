import {
  Alert,
  Box,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Fab,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import ExpandLessRoundedIcon from '@mui/icons-material/ExpandLessRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { goalsApi, tasksApi } from '../api'
import AddGoalDialog from '../components/goals/AddGoalDialog'
import GoalCategoryIcon from '../components/goals/GoalCategoryIcon'
import AddTaskDialog from '../components/tasks/AddTaskDialog'
import TaskPreviewDrawer from '../components/tasks/TaskPreviewDrawer'
import { useAuth } from '../contexts/AuthContext'
import { GoalType } from '../types'
import type { Goal, TaskItem } from '../types'
import { applyFilter, PRIORITY_COLOR } from '../utils'
import type { Filter } from '../utils'

const filters: Filter[] = ['all', 'today', 'completed']

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const [goal, setGoal] = useState<Goal | null>(null)
  const [allGoals, setAllGoals] = useState<Goal[]>([])
  const [localTasks, setLocalTasks] = useState<TaskItem[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [filter, setFilter] = useState<Filter>('all')

  const [addOpen, setAddOpen] = useState(false)
  const [editGoalOpen, setEditGoalOpen] = useState(false)
  const [editTask, setEditTask] = useState<TaskItem | null>(null)
  const [previewTask, setPreviewTask] = useState<TaskItem | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isFiniteGoal = goal?.goalType === GoalType.Finite

  const visibleTasks = useMemo(
    () => applyFilter(localTasks, filter),
    [localTasks, filter],
  )

  const totalCount = localTasks.length
  const completedCount = localTasks.filter((task) => task.isCompleted).length
  const overallPct = totalCount ? Math.round((completedCount / totalCount) * 100) : 0

  const weeklyTotal = goal?.weeklyTotal ?? 0
  const weeklyCompleted = goal?.weeklyCompleted ?? 0
  const weeklyPct = weeklyTotal ? Math.round((weeklyCompleted / weeklyTotal) * 100) : 0

  const formattedDue = goal?.dueDate
    ? new Date(goal.dueDate).toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : null

  const loadData = useCallback(async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    try {
      const goalsApiAny = goalsApi as any
      const tasksApiAny = tasksApi as any

      const goalResult =
        goalsApiAny.getById?.(id) ??
        goalsApiAny.get?.(id) ??
        goalsApiAny.getGoal?.(id)

      const goalsResult =
        goalsApiAny.getAll?.() ??
        goalsApiAny.list?.() ??
        goalsApiAny.getGoals?.()

      const tasksResult =
        tasksApiAny.getByGoalId?.(id) ??
        tasksApiAny.getByGoal?.(id) ??
        tasksApiAny.getTasksByGoal?.(id) ??
        tasksApiAny.getAll?.({ goalId: id })

      const [loadedGoal, loadedGoals, loadedTasks] = await Promise.all([
        goalResult,
        goalsResult,
        tasksResult,
      ])

      setGoal(loadedGoal?.data ?? loadedGoal ?? null)
      setAllGoals(loadedGoals?.data ?? loadedGoals ?? [])
      setLocalTasks(loadedTasks?.data ?? loadedTasks ?? [])
    } catch (err) {
      console.error(err)
      setError(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const toggleExpand = (taskId: string) => {
    setExpanded((prev) => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  const toggleTaskComplete = async (taskId: string) => {
    const task = localTasks.find((item) => item.id === taskId)
    if (!task) return

    const updated = { ...task, isCompleted: !task.isCompleted }

    setLocalTasks((prev) =>
      prev.map((item) => (item.id === taskId ? updated : item)),
    )

    try {
      const api = tasksApi as any
      await (
        api.update?.(taskId, updated) ??
        api.updateTask?.(taskId, updated) ??
        api.toggleComplete?.(taskId)
      )
    } catch (err) {
      console.error(err)
      setLocalTasks((prev) =>
        prev.map((item) => (item.id === taskId ? task : item)),
      )
    }
  }

  const toggleSubComplete = async (taskId: string, subTaskId: string) => {
    const task = localTasks.find((item) => item.id === taskId)
    if (!task?.subTasks) return

    const updatedTask = {
      ...task,
      subTasks: task.subTasks.map((subTask) =>
        subTask.id === subTaskId
          ? { ...subTask, isCompleted: !subTask.isCompleted }
          : subTask,
      ),
    }

    setLocalTasks((prev) =>
      prev.map((item) => (item.id === taskId ? updatedTask : item)),
    )

    try {
      const api = tasksApi as any
      await (
        api.update?.(taskId, updatedTask) ??
        api.updateTask?.(taskId, updatedTask) ??
        api.toggleSubTaskComplete?.(taskId, subTaskId)
      )
    } catch (err) {
      console.error(err)
      setLocalTasks((prev) =>
        prev.map((item) => (item.id === taskId ? task : item)),
      )
    }
  }

  if (loading) {
    return (
      <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !goal) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error ?? t('common.noData')}</Alert>
      </Box>
    )
  }

  return (
    <>
      <Box sx={{ pb: 10 }}>
        <Box
          sx={{
            p: 2,
            bgcolor: 'background.paper',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
            <GoalCategoryIcon category={goal.category} />

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={800}>
                {goal.title}
              </Typography>

              {/* תיאור לא קיים במודל Goal, לכן מסירים */}
            </Box>

            <IconButton size="small" onClick={() => setEditGoalOpen(true)}>
              <EditRoundedIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 1,
              mb: 2,
            }}
          >
            <Box sx={statCardSx}>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {overallPct}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('goal.progress')}
              </Typography>
            </Box>

            <Box sx={statCardSx}>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                {completedCount}/{totalCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('goal.tasks')}
              </Typography>
            </Box>

            <Box sx={statCardSx}>
              {isFiniteGoal ? (
                <>
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    {formattedDue ?? '—'}
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

          {isFiniteGoal ? (
            <LinearProgress
              variant="determinate"
              value={overallPct}
              sx={progressBarSx}
            />
          ) : (
            <>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mb: 0.5, display: 'block' }}
              >
                {t('goal.weeklyProgress')} —{' '}
                {t('goal.weeklyStats', {
                  completed: weeklyCompleted,
                  total: weeklyTotal,
                })}
              </Typography>

              <LinearProgress
                variant="determinate"
                value={weeklyPct}
                sx={progressBarSx}
              />
            </>
          )}
        </Box>

        <Box sx={{ px: 2, pt: 2, pb: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {filters.map((item) => (
              <Chip
                key={item}
                label={t(`task.filter.${item}`)}
                onClick={() => setFilter(item)}
                variant={filter === item ? 'filled' : 'outlined'}
                size="small"
                sx={{
                  fontWeight: filter === item ? 700 : 400,
                  bgcolor: filter === item ? 'primary.main' : 'transparent',
                  color: filter === item ? 'white' : 'text.secondary',
                  borderColor: filter === item ? 'primary.main' : 'divider',
                  '&:hover': {
                    bgcolor: filter === item ? 'primary.dark' : 'action.hover',
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        <Box sx={{ px: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={700}
            sx={{
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              mb: 1,
              display: 'block',
            }}
          >
            {t('goal.tasks')} ({visibleTasks.length})
          </Typography>

          {visibleTasks.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ py: 2, textAlign: 'center' }}
            >
              {t('common.noData')}
            </Typography>
          ) : (
            <List disablePadding>
              {visibleTasks.map((task, index) => {
                const hasSubTasks = (task.subTasks?.length ?? 0) > 0
                const isOpen = expanded[task.id] ?? false

                return (
                  <Box key={task.id}>
                    {index > 0 && <Divider />}

                    <ListItem
                      disablePadding
                      sx={{ py: 1.25, alignItems: 'flex-start' }}
                    >
                      <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                        <Checkbox
                          edge="start"
                          checked={task.isCompleted}
                          onChange={() => toggleTaskComplete(task.id)}
                          disableRipple
                          icon={
                            <RadioButtonUncheckedRoundedIcon
                              sx={{ color: 'text.disabled' }}
                            />
                          }
                          checkedIcon={
                            <CheckCircleRoundedIcon sx={{ color: 'primary.main' }} />
                          }
                          size="small"
                        />
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                flexShrink: 0,
                                bgcolor: PRIORITY_COLOR[task.priority] ?? '#999',
                              }}
                            />

                            <Typography
                              variant="body2"
                              sx={{
                                textDecoration: task.isCompleted
                                  ? 'line-through'
                                  : 'none',
                                color: task.isCompleted
                                  ? 'text.disabled'
                                  : 'text.primary',
                                fontWeight: 500,
                                flex: 1,
                              }}
                            >
                              {task.title}
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                              <Tooltip title={t('task.preview')}>
                                <IconButton
                                  size="small"
                                  onClick={() => setPreviewTask(task)}
                                  sx={{ p: 0.25 }}
                                >
                                  <VisibilityRoundedIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>

                              <IconButton
                                size="small"
                                onClick={() => setEditTask(task)}
                                sx={{ p: 0.25 }}
                              >
                                <EditRoundedIcon
                                  sx={{ fontSize: 15, color: 'text.disabled' }}
                                />
                              </IconButton>

                              {hasSubTasks && (
                                <IconButton
                                  size="small"
                                  onClick={() => toggleExpand(task.id)}
                                  sx={{ p: 0.25 }}
                                >
                                  {isOpen ? (
                                    <ExpandLessRoundedIcon sx={{ fontSize: 15 }} />
                                  ) : (
                                    <ExpandMoreRoundedIcon sx={{ fontSize: 15 }} />
                                  )}
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Box
                            component="span"
                            sx={{
                              display: 'flex',
                              gap: 1,
                              mt: 0.25,
                              flexWrap: 'wrap',
                            }}
                          >
                            {task.dueDate && (
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                              >
                                {t('task.dueDate')}:{' '}
                                {new Date(task.dueDate).toLocaleDateString(
                                  i18n.language,
                                  { day: '2-digit', month: '2-digit' },
                                )}
                              </Typography>
                            )}

                            {task.durationMinutes && (
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                              >
                                {task.durationMinutes}
                                {t('task.minutesShort')}
                              </Typography>
                            )}

                            {hasSubTasks && (
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                              >
                                {t('task.subtasks')}:{' '}
                                {task.subTasks!.filter((sub) => sub.isCompleted).length}/
                                {task.subTasks!.length}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>

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
                                  icon={
                                    <RadioButtonUncheckedRoundedIcon
                                      sx={{
                                        fontSize: 16,
                                        color: 'text.disabled',
                                      }}
                                    />
                                  }
                                  checkedIcon={
                                    <CheckCircleRoundedIcon
                                      sx={{
                                        fontSize: 16,
                                        color: 'primary.main',
                                      }}
                                    />
                                  }
                                  size="small"
                                />
                              </ListItemIcon>

                              <ListItemText
                                primary={
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      textDecoration: sub.isCompleted
                                        ? 'line-through'
                                        : 'none',
                                      color: sub.isCompleted
                                        ? 'text.disabled'
                                        : 'text.secondary',
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

      <Fab
        color="primary"
        variant="extended"
        aria-label={t('task.new')}
        onClick={() => setAddOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 80, sm: 24 },
          right: { xs: 16, sm: 24 },
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
        onAdd={(task) => {
          setLocalTasks((prev) => [task, ...prev])
          setAddOpen(false)
        }}
        goals={allGoals}
        userId={user?.id ?? ''}
        defaultGoalId={id}
      />

      <AddTaskDialog
        open={!!editTask}
        onClose={() => setEditTask(null)}
        onAdd={() => undefined}
        onEdit={(updated) => {
          setLocalTasks((prev) =>
            prev.map((task) => (task.id === updated.id ? updated : task)),
          )
          setEditTask(null)
        }}
        editTask={editTask ?? undefined}
        goals={allGoals}
        userId={user?.id ?? ''}
      />

      <AddGoalDialog
        open={editGoalOpen}
        onClose={() => setEditGoalOpen(false)}
        onAdd={() => undefined}
        onEdit={(updated) => {
          setGoal(updated)
          setEditGoalOpen(false)
        }}
        editGoal={goal}
        userId={user?.id ?? ''}
        createGoal={goalsApi.create}
      />

      <TaskPreviewDrawer
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onEdit={() => {
          setEditTask(previewTask)
          setPreviewTask(null)
        }}
      />
    </>
  )
}

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
  '& .MuiLinearProgress-bar': {
    bgcolor: 'primary.main',
    borderRadius: 4,
  },
} as const
