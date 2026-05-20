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
import DeleteRoundedIcon               from '@mui/icons-material/DeleteRounded'
import ShareRoundedIcon                from '@mui/icons-material/ShareRounded'
import type { SvgIconComponent }       from '@mui/icons-material'
import { useTranslation }  from 'react-i18next'
import { useNavigate }     from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth }                     from '../contexts/AuthContext'
import { tasksApi, goalsApi }          from '../api'
import { Priority, RecurrenceType } from '../types'
import type { TaskItem, Goal }         from '../types'
import { Filter, TODAY, applyFilter, isArchivedCompleted, PRIORITY_COLOR } from '../utils'
import AddTaskDialog from '../components/tasks/AddTaskDialog'
import ShareDialog from '../components/ShareDialog'

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

  // Request notification permission and schedule near-future reminders
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (Notification.permission !== 'granted') return
    const now = Date.now()
    const HOUR_MS = 60 * 60 * 1000
    localTasks.forEach((task) => {
      if (!task.reminderAt || task.isCompleted) return
      const remTime = new Date(task.reminderAt).getTime()
      const delay = remTime - now
      if (delay > 0 && delay <= HOUR_MS) {
        const tid = setTimeout(() => {
          new Notification(task.title, { body: '⏰ ' + task.title, icon: '/favicon.ico' })
        }, delay)
        return () => clearTimeout(tid)
      }
    })
  }, [localTasks])

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
    setLocalTasks((prev) => {
      const updated = prev.map((t) => {
        if (t.id !== taskId) return t
        const newSubs = (t.subTasks ?? []).map((s) =>
          s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s,
        )
        const allDone = newSubs.length > 0 && newSubs.every((s) => s.isCompleted)
        return { ...t, subTasks: newSubs, isCompleted: allDone ? true : t.isCompleted }
      })
      // fire API calls outside render
      const task = updated.find((t) => t.id === taskId)
      const sub  = task?.subTasks?.find((s) => s.id === subId)
      if (sub) tasksApi.updateSubTask(subId, { isCompleted: sub.isCompleted }).catch(() => {})
      if (task?.isCompleted && !prev.find((t) => t.id === taskId)?.isCompleted) {
        tasksApi.update(taskId, { isCompleted: true }).catch(() => {})
      }
      return updated
    })
  }, [])

  const handleAddTask = useCallback((task: TaskItem) => {
    setLocalTasks((prev) => [task, ...prev])
    setAddOpen(false)
  }, [])

  const handleEditTask = useCallback((task: TaskItem) => {
    setLocalTasks((prev) => prev.map((t) => t.id === task.id ? task : t))
    setEditTask(null)
  }, [])

  const handleDeleteTask = useCallback((taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId))
    tasksApi.delete(taskId).catch(() => {
      tasksApi.getByUser(user!.id).then(setLocalTasks).catch(() => {})
    })
  }, [user])
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

  const filtered = applyFilter(localTasks.filter((t) => !isArchivedCompleted(t)), filter)

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

      {/* ── No tasks at all ── */}
      {localTasks.length === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 1.5 }}>
          <Typography sx={{ fontSize: 56, lineHeight: 1 }}>✅</Typography>
          <Typography variant="body1" fontWeight={700} color="text.primary">
            {t('task.emptyTitle')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: 260 }}>
            {t('task.emptySubtitle')}
          </Typography>
        </Box>
      )}

      {/* ── No results for current filter ── */}
      {localTasks.length > 0 && grouped.length === 0 && ungrouped.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          {t('task.emptyFilter')}
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
            onDelete={handleDeleteTask}
            completedInitiallyOpen={filter === 'completed'}
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
            onDelete={handleDeleteTask}
            completedInitiallyOpen={filter === 'completed'}
            i18n={i18n}
            t={t}
          />
        </Box>
      )}

      {/* ── Add Task FAB ── */}
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
        onAdd={handleAddTask}
        onGoalCreated={(g) => setGoals((prev) => [...prev, g])}
        goals={goals}
        userId={user?.id ?? ''}
      />

      <AddTaskDialog
        open={!!editTask}
        onClose={() => setEditTask(null)}
        onAdd={handleAddTask}
        onEdit={handleEditTask}
        onGoalCreated={(g) => setGoals((prev) => [...prev, g])}
        editTask={editTask ?? undefined}
        goals={goals}
        userId={user?.id ?? ''}
      />
    </Box>
  )
}

// ─── TaskGroup ────────────────────────────────────────────────────────────────
interface TaskGroupProps {
  tasks:                   TaskItem[]
  expanded:                Record<string, boolean>
  onToggleExpand:          (id: string) => void
  onToggleTask:            (id: string) => void
  onToggleSub:             (taskId: string, subId: string) => void
  onEdit:                  (task: TaskItem) => void
  onDelete:                (id: string) => void
  completedInitiallyOpen?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t:                       (key: string, opts?: any) => string
  i18n:                    { language: string }
}

function TaskGroup({ tasks, expanded, onToggleExpand, onToggleTask, onToggleSub, onEdit, onDelete, completedInitiallyOpen = false, t, i18n }: TaskGroupProps) {
  const [shareTask, setShareTask] = useState<TaskItem | null>(null)
  const [showDone, setShowDone]   = useState(completedInitiallyOpen)

  const activeTasks = tasks.filter((tk) => !tk.isCompleted)
  const doneTasks   = tasks.filter((tk) => tk.isCompleted)

  return (
    <>
    {/* ── Active tasks ── */}
    {activeTasks.length > 0 && (
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
        {activeTasks.map((task, index) => {
          const hasSubs = (task.subTasks?.length ?? 0) > 0
          const isOpen  = expanded[task.id] ?? false

          return (
            <Box key={task.id}>
              {index > 0 && <Divider />}

              <ListItem
                disablePadding
                sx={{ px: 1.5, py: 1, alignItems: 'flex-start' }}
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
                          flex: 1,
                        }}
                      >
                        {task.title}
                      </Typography>
                      {/* Action buttons inline - no overlap */}
                      <Box sx={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                        <IconButton size="small" onClick={() => onEdit(task)} sx={{ p: 0.25 }}>
                          <EditRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => onDelete(task.id)} sx={{ p: 0.25 }}>
                          <DeleteRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => setShareTask(task)} sx={{ p: 0.25 }}>
                          <ShareRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                        </IconButton>
                        {hasSubs && (
                          <IconButton size="small" onClick={() => onToggleExpand(task.id)} sx={{ p: 0.25 }}>
                            {isOpen
                              ? <ExpandLessRoundedIcon sx={{ fontSize: 15 }} />
                              : <ExpandMoreRoundedIcon sx={{ fontSize: 15 }} />}
                          </IconButton>
                        )}
                      </Box>
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
                      {task.recurrenceType && task.recurrenceType !== RecurrenceType.None && (
                        <Typography component="span" variant="caption" color="primary.main" sx={{ fontWeight: 600 }}>
                          🔁 {t(`recurrence.${task.recurrenceType}`, task.recurrenceType)}
                        </Typography>
                      )}
                      {task.reminderAt && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          🔔 {new Date(task.reminderAt).toLocaleString(i18n.language, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
    )}

    {/* ── Completed section ── */}
    {doneTasks.length > 0 && (
      <Box sx={{ mt: activeTasks.length > 0 ? 1.5 : 0 }}>
        {/* Collapsible header */}
        <Box
          onClick={() => setShowDone((v) => !v)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            cursor: 'pointer',
            px: 0.5,
            py: 0.75,
            borderRadius: 2,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'success.main', opacity: 0.7 }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ flex: 1 }}>
            {t('task.completedSection', { count: doneTasks.length })}
          </Typography>
          {showDone
            ? <ExpandLessRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
            : <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
        </Box>

        <Collapse in={showDone}>
          <Box
            sx={{
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              opacity: 0.75,
              boxShadow: 'none',
              mt: 0.5,
            }}
          >
            <List disablePadding>
              {doneTasks.map((task, index) => {
                const hasSubs = (task.subTasks?.length ?? 0) > 0
                const isOpen  = expanded[task.id] ?? false
                return (
                  <Box key={task.id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding sx={{ px: 1.5, py: 1, alignItems: 'flex-start' }}>
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
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, bgcolor: PRIORITY_COLOR[task.priority] ?? '#999' }} />
                            <Typography variant="body2" fontWeight={500} sx={{ textDecoration: 'line-through', color: 'text.disabled', flex: 1 }}>
                              {task.title}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 0, flexShrink: 0 }}>
                              <IconButton size="small" onClick={() => onEdit(task)} sx={{ p: 0.25 }}>
                                <EditRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                              </IconButton>
                              <IconButton size="small" onClick={() => onDelete(task.id)} sx={{ p: 0.25 }}>
                                <DeleteRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                              </IconButton>
                              {hasSubs && (
                                <IconButton size="small" onClick={() => onToggleExpand(task.id)} sx={{ p: 0.25 }}>
                                  {isOpen ? <ExpandLessRoundedIcon sx={{ fontSize: 15 }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 15 }} />}
                                </IconButton>
                              )}
                            </Box>
                          </Box>
                        }
                        secondary={
                          task.dueDate ? (
                            <Typography component="span" variant="caption" color="text.disabled">
                              {t('task.dueDate')}: {new Date(task.dueDate).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' })}
                            </Typography>
                          ) : undefined
                        }
                      />
                    </ListItem>
                    {hasSubs && (
                      <Collapse in={isOpen}>
                        <List disablePadding sx={{ pl: 5, bgcolor: 'action.hover', pb: 0.5 }}>
                          {task.subTasks!.map((sub) => (
                            <ListItem key={sub.id} disablePadding sx={{ py: 0.25 }}>
                              <ListItemIcon sx={{ minWidth: 30 }}>
                                <Checkbox edge="start" checked={sub.isCompleted} onChange={() => onToggleSub(task.id, sub.id)} disableRipple
                                  icon={<RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />}
                                  checkedIcon={<CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} />} size="small" />
                              </ListItemIcon>
                              <ListItemText primary={
                                <Typography variant="caption" sx={{ textDecoration: 'line-through', color: 'text.disabled' }}>
                                  {sub.title}
                                </Typography>
                              } />
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
        </Collapse>
      </Box>
    )}

    {shareTask && (
      <ShareDialog
        open={!!shareTask}
        onClose={() => setShareTask(null)}
        resourceType="Task"
        resourceId={shareTask.id}
        resourceTitle={shareTask.title}
      />
    )}
  </>
  )
}
