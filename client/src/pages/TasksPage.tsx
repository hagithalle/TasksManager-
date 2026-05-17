import {
  Box, ButtonBase, Checkbox, Chip, Collapse, Divider, Fab,
  IconButton, List, ListItem,
  ListItemIcon, ListItemText, Typography,
} from '@mui/material'
import AddRoundedIcon                  from '@mui/icons-material/AddRounded'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import ExpandMoreRoundedIcon           from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon           from '@mui/icons-material/ExpandLessRounded'
import ErrorRoundedIcon                from '@mui/icons-material/ErrorRounded'
import CalendarMonthRoundedIcon        from '@mui/icons-material/CalendarMonthRounded'
import TodayRoundedIcon                from '@mui/icons-material/TodayRounded'
import EditRoundedIcon                 from '@mui/icons-material/EditRounded'
import type { SvgIconComponent }       from '@mui/icons-material'
import { useTranslation }  from 'react-i18next'
import { useNavigate }     from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth }                     from '../contexts/AuthContext'
import { tasksApi, goalsApi }          from '../api'
import { Priority }     from '../types'
import type { TaskItem, Goal }         from '../types'
import { Filter, TODAY, applyFilter, PRIORITY_COLOR } from '../utils'
import AddTaskDialog from '../components/tasks/AddTaskDialog'

// ─── component ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { t, i18n } = useTranslation()
  const navigate     = useNavigate()
  const { user }     = useAuth()

  const [searchParams] = useSearchParams()
  const [filter,   setFilter]   = useState<Filter>(() => {
    const qp = searchParams.get('filter')
    return (qp === 'today' || qp === 'urgent' || qp === 'completed') ? qp : 'all'
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [localTasks, setLocalTasks] = useState<TaskItem[]>([])
  const [goals,      setGoals]      = useState<Goal[]>([])
  const [addOpen,    setAddOpen]    = useState(false)
  const [editTask,   setEditTask]   = useState<TaskItem | null>(null)

  useEffect(() => {
    if (!user) return
    tasksApi.getByUser(user.id).then(setLocalTasks).catch(() => {})
    goalsApi.getByUser(user.id).then(setGoals).catch(() => {})
  }, [user])

  const toggleTaskComplete = useCallback((taskId: string) => {
    const task = localTasks.find((t) => t.id === taskId)
    if (!task) return
    const updated = { ...task, isCompleted: !task.isCompleted }
    setLocalTasks((prev) => prev.map((t) => t.id === taskId ? updated : t))
    tasksApi.update(taskId, { isCompleted: updated.isCompleted }).catch(() => {
      setLocalTasks((prev) => prev.map((t) => t.id === taskId ? task : t))
    })
  }, [localTasks])

  const toggleSubComplete = useCallback((taskId: string, subId: string) => {
    setLocalTasks((prev) => prev.map((t) => {
      if (t.id !== taskId) return t
      return {
        ...t,
        subTasks: (t.subTasks ?? []).map((s) =>
          s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s,
        ),
      }
    }))
  }, [])

  const handleAddTask = useCallback((task: TaskItem) => {
    setLocalTasks((prev) => [task, ...prev])
    setAddOpen(false)
  }, [])

  const handleEditTask = useCallback((task: TaskItem) => {
    setLocalTasks((prev) => prev.map((t) => t.id === task.id ? task : t))
    setEditTask(null)
  }, [])
  // ── stats (always over the full data set) ──
  const statsCompleted = localTasks.filter((tk) => tk.isCompleted).length
  const statsUrgent    = localTasks.filter(
    (tk) => !tk.isCompleted && (tk.priority === Priority.Critical || tk.priority === Priority.High),
  ).length
  const statsToday     = localTasks.filter(
    (tk) => !tk.isCompleted && tk.dueDate?.startsWith(TODAY),
  ).length
  const statsTotal     = localTasks.length

  const stats: {
    key:   Filter | null
    label: string
    value: number
    iconBg:    string
    iconColor: string
    Icon:  SvgIconComponent
  }[] = [
    {
      key: 'urgent',
      label: t('task.stats.urgent'),
      value: statsUrgent,
      iconBg:    '#FFEBEE',
      iconColor: '#C62828',
      Icon: ErrorRoundedIcon,
    },
    {
      key: 'completed',
      label: t('task.stats.completed'),
      value: statsCompleted,
      iconBg:    '#E8F5E9',
      iconColor: '#2E7D32',
      Icon: CheckCircleRoundedIcon,
    },
    {
      key: 'today',
      label: t('task.stats.today'),
      value: statsToday,
      iconBg:    '#EDE9FF',
      iconColor: '#5438CC',
      Icon: TodayRoundedIcon,
    },
    {
      key: null,
      label: t('task.stats.total'),
      value: statsTotal,
      iconBg:    '#E3F2FD',
      iconColor: '#1565C0',
      Icon: CalendarMonthRoundedIcon,
    },
  ]

  const filtered = applyFilter(localTasks, filter)

  // group by goalId
  const grouped = goals
    .map((goal) => ({
      goal,
      tasks: filtered.filter((tk) => tk.goalId === goal.id),
    }))
    .filter((g) => g.tasks.length > 0)

  // tasks without a goal
  const ungrouped = filtered.filter((tk) => !tk.goalId)

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const filters: Filter[] = ['all', 'today', 'urgent', 'completed']

  return (
    <Box sx={{ px: 2, pt: 2, pb: 4 }}>

      {/* ── Stats strip ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          mb: 2.5,
        }}
      >
        {stats.map((s) => {
          const active = s.key !== null && filter === s.key
          return (
            <ButtonBase
              key={s.label}
              onClick={() => s.key && setFilter(s.key)}
              sx={{ borderRadius: 2.5, display: 'block', width: '100%' }}
            >
              <Box
                sx={{
                  borderRadius: 2.5,
                  py: 1.25,
                  px: 0.5,
                  textAlign: 'center',
                  border: '1.5px solid',
                  borderColor: active ? s.iconColor : 'rgba(124,92,255,0.08)',
                  bgcolor: active ? s.iconBg : 'white',
                  boxShadow: active
                    ? `0 2px 8px ${s.iconColor}22`
                    : '0 1px 4px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s',
                }}
              >
                {/* Icon circle */}
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: s.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 0.75,
                  }}
                >
                  <s.Icon sx={{ fontSize: 20, color: s.iconColor }} />
                </Box>

                {/* Number */}
                <Typography
                  variant="h6"
                  fontWeight={700}
                  lineHeight={1}
                  sx={{ color: s.iconColor }}
                >
                  {s.value}
                </Typography>

                {/* Label */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: '0.6rem', display: 'block', mt: 0.25 }}
                >
                  {s.label}
                </Typography>
              </Box>
            </ButtonBase>
          )
        })}
      </Box>

      {/* ── Filter chips ── */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {filters.map((f) => (
          <Chip
            key={f}
            label={t(`task.filter.${f}`)}
            onClick={() => setFilter(f)}
            variant={filter === f ? 'filled' : 'outlined'}
            size="small"
            sx={{
              fontWeight:  filter === f ? 700 : 400,
              bgcolor:     filter === f ? 'primary.main' : 'transparent',
              color:       filter === f ? 'white' : 'text.secondary',
              borderColor: filter === f ? 'primary.main' : 'divider',
              '&:hover': { bgcolor: filter === f ? 'primary.dark' : 'action.hover' },
            }}
          />
        ))}
      </Box>

      {/* ── No results ── */}
      {grouped.length === 0 && ungrouped.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t('common.noData')}
        </Typography>
      )}

      {/* ── Grouped by goal ── */}
      {grouped.map(({ goal, tasks }) => (
        <Box key={goal.id} sx={{ mb: 3 }}>
          {/* Goal heading */}
          <Box
            onClick={() => navigate(`/goals/${goal.id}`)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 0.5,
              cursor: 'pointer',
            }}
          >
            <Typography
              variant="caption"
              fontWeight={700}
              color="primary.main"
              sx={{ letterSpacing: 0.4, textTransform: 'uppercase' }}
            >
              {goal.title}
            </Typography>
            <Typography variant="caption" color="text.disabled">
              {tasks.filter((tk) => tk.isCompleted).length}/{tasks.length}
            </Typography>
          </Box>

          <TaskGroup
            tasks={tasks}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onToggleTask={toggleTaskComplete}
            onToggleSub={toggleSubComplete}
            onEdit={setEditTask}
            i18n={i18n}
            t={t}
          />
        </Box>
      ))}

      {/* ── Tasks without a goal ── */}
      {ungrouped.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ letterSpacing: 0.4, textTransform: 'uppercase', mb: 0.5, display: 'block' }}
          >
            {t('task.noGoal')}
          </Typography>
          <TaskGroup
            tasks={ungrouped}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onToggleTask={toggleTaskComplete}
            onToggleSub={toggleSubComplete}
            onEdit={setEditTask}
            i18n={i18n}
            t={t}
          />
        </Box>
      )}

      {/* ── Add Task FAB ── */}
      <Fab
        color="primary"
        aria-label={t('task.new')}
        onClick={() => setAddOpen(true)}
        sx={{
          position: 'fixed',
          bottom: { xs: 80, sm: 24 },
          right: { xs: 16, sm: 24 },
          left: 'auto',
          boxShadow: '0 4px 16px rgba(124,92,255,0.4)',
        }}
      >
        <AddRoundedIcon />
      </Fab>

      <AddTaskDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAddTask}
        goals={goals}
        userId={user?.id ?? ''}
      />

      <AddTaskDialog
        open={!!editTask}
        onClose={() => setEditTask(null)}
        onAdd={handleAddTask}
        onEdit={handleEditTask}
        editTask={editTask ?? undefined}
        goals={goals}
        userId={user?.id ?? ''}
      />
    </Box>
  )
}

// ─── TaskGroup ────────────────────────────────────────────────────────────────
interface TaskGroupProps {
  tasks:          TaskItem[]
  expanded:       Record<string, boolean>
  onToggleExpand: (id: string) => void
  onToggleTask:   (id: string) => void
  onToggleSub:    (taskId: string, subId: string) => void
  onEdit:         (task: TaskItem) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t:              (key: string, opts?: any) => string
  i18n:           { language: string }
}

function TaskGroup({ tasks, expanded, onToggleExpand, onToggleTask, onToggleSub, onEdit, t, i18n }: TaskGroupProps) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        boxShadow: '0 1px 6px rgba(124,92,255,0.06)',
      }}
    >
      <List disablePadding>
        {tasks.map((task, index) => {
          const hasSubs = (task.subTasks?.length ?? 0) > 0
          const isOpen  = expanded[task.id] ?? false

          return (
            <Box key={task.id}>
              {index > 0 && <Divider />}

              <ListItem
                disablePadding
                sx={{ px: 1.5, py: 1, alignItems: 'flex-start' }}
                secondaryAction={
                  <Box sx={{ display: 'flex', gap: 0 }}>
                    <IconButton size="small" onClick={() => onEdit(task)}>
                      <EditRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    </IconButton>
                    {hasSubs && (
                      <IconButton size="small" edge="end" onClick={() => onToggleExpand(task.id)}>
                        {isOpen
                          ? <ExpandLessRoundedIcon fontSize="small" />
                          : <ExpandMoreRoundedIcon fontSize="small" />}
                      </IconButton>
                    )}
                  </Box>
                }
              >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.25 }}>
                  <Checkbox
                    edge="start"
                    checked={task.isCompleted}
                    onChange={() => onToggleTask(task.id)}
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
                          bgcolor: PRIORITY_COLOR[task.priority] ?? '#999',
                        }}
                      />
                      <Typography
                        variant="body2"
                        fontWeight={500}
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
                    <Box component="span" sx={{ display: 'flex', gap: 1.5, mt: 0.25, flexWrap: 'wrap' }}>
                      {task.dueDate && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {t('task.dueDate')}: {new Date(task.dueDate).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' })}
                        </Typography>
                      )}
                      {task.durationMinutes && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {task.durationMinutes} {t('task.minutesShort')}
                        </Typography>
                      )}
                      {hasSubs && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {t('task.subtasks')}: {task.subTasks!.filter((s) => s.isCompleted).length}/{task.subTasks!.length}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>

              {/* Sub-tasks */}
              {hasSubs && (
                <Collapse in={isOpen}>
                  <List disablePadding sx={{ pl: 5, bgcolor: 'action.hover', pb: 0.5 }}>
                    {task.subTasks!.map((sub) => (
                      <ListItem key={sub.id} disablePadding sx={{ py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Checkbox
                            edge="start"
                            checked={sub.isCompleted}
                            onChange={() => onToggleSub(task.id, sub.id)}
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
    </Box>
  )
}
