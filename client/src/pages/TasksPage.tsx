import {
  Box, Button, ButtonBase, Checkbox, Chip, Collapse, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, Fab,
  FormControl, IconButton, InputLabel, List, ListItem,
  ListItemIcon, ListItemText, MenuItem, Select, TextField, Typography,
} from '@mui/material'
import AddRoundedIcon                  from '@mui/icons-material/AddRounded'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import ExpandMoreRoundedIcon           from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon           from '@mui/icons-material/ExpandLessRounded'
import ErrorRoundedIcon                from '@mui/icons-material/ErrorRounded'
import CalendarMonthRoundedIcon        from '@mui/icons-material/CalendarMonthRounded'
import TodayRoundedIcon                from '@mui/icons-material/TodayRounded'
import type { SvgIconComponent }       from '@mui/icons-material'
import { useTranslation }  from 'react-i18next'
import { useNavigate }     from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { mockTasks, mockGoals }        from '../data'
import { ExecutionType, Priority }     from '../types'
import type { TaskItem }               from '../types'
import { Filter, TODAY, applyFilter, PRIORITY_COLOR, PRIORITY_STYLE, EXECUTION_STYLE } from '../utils'

// ─── component ───────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { t, i18n } = useTranslation()
  const navigate     = useNavigate()

  const [searchParams] = useSearchParams()
  const [filter,   setFilter]   = useState<Filter>(() => {
    const qp = searchParams.get('filter')
    return (qp === 'today' || qp === 'urgent' || qp === 'completed') ? qp : 'all'
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [localTasks, setLocalTasks] = useState<TaskItem[]>(() => mockTasks)
  const [addOpen,    setAddOpen]    = useState(false)

  const toggleTaskComplete = useCallback((taskId: string) => {
    setLocalTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t,
    ))
  }, [])

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
  const grouped = mockGoals
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t:              (key: string, opts?: any) => string
  i18n:           { language: string }
}

function TaskGroup({ tasks, expanded, onToggleExpand, onToggleTask, onToggleSub, t, i18n }: TaskGroupProps) {
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
                  hasSubs ? (
                    <IconButton size="small" edge="end" onClick={() => onToggleExpand(task.id)}>
                      {isOpen
                        ? <ExpandLessRoundedIcon fontSize="small" />
                        : <ExpandMoreRoundedIcon fontSize="small" />}
                    </IconButton>
                  ) : undefined
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

// ─── AddTaskDialog ────────────────────────────────────────────────────────────
interface AddTaskDialogProps {
  open:    boolean
  onClose: () => void
  onAdd:   (task: TaskItem) => void
}

function AddTaskDialog({ open, onClose, onAdd }: AddTaskDialogProps) {
  const { t } = useTranslation()

  const [title,           setTitle]           = useState('')
  const [goalId,          setGoalId]          = useState<string>('')
  const [priority,        setPriority]        = useState<Priority>(Priority.Medium)
  const [executionType,   setExecutionType]   = useState<ExecutionType>(ExecutionType.Short)
  const [dueDate,         setDueDate]         = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [titleError,      setTitleError]      = useState(false)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setGoalId('')
      setPriority(Priority.Medium)
      setExecutionType(ExecutionType.Short)
      setDueDate('')
      setDurationMinutes('')
      setTitleError(false)
    }
  }, [open])

  function handleSubmit() {
    if (!title.trim()) { setTitleError(true); return }
    onAdd({
      id:              `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title:           title.trim(),
      goalId:          goalId || undefined,
      priority,
      executionType,
      dueDate:         dueDate || undefined,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      isCompleted:     false,
      subTasks:        [],
      createdAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
    })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{t('task.new')}</DialogTitle>

      <DialogContent sx={{ pt: '12px !important' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          {/* Title */}
          <TextField
            label={t('task.title')}
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
            error={titleError}
            helperText={titleError ? t('common.required') : undefined}
            fullWidth
            autoFocus
            size="small"
          />

          {/* Goal */}
          <FormControl fullWidth size="small">
            <InputLabel>{t('nav.goals')}</InputLabel>
            <Select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              label={t('nav.goals')}
            >
              <MenuItem value="">{t('task.noGoal')}</MenuItem>
              {mockGoals.map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.title}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Priority */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              {t('task.priority')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {([Priority.Low, Priority.Medium, Priority.High, Priority.Critical] as Priority[]).map((p) => {
                const style  = PRIORITY_STYLE[p]
                const active = priority === p
                return (
                  <Chip
                    key={p}
                    label={t(`priority.${p}`)}
                    onClick={() => setPriority(p)}
                    sx={{
                      fontWeight: 700,
                      bgcolor:    active ? style.color : 'transparent',
                      color:      active ? 'white'     : style.color,
                      border:     `1.5px solid ${style.color}`,
                      '&:hover':  { bgcolor: active ? style.color : `${style.color}18` },
                    }}
                  />
                )
              })}
            </Box>
          </Box>

          {/* Execution Type */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              {t('task.executionTime')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {([ExecutionType.Quick, ExecutionType.Short, ExecutionType.Medium, ExecutionType.Long] as ExecutionType[]).map((et) => {
                const style  = EXECUTION_STYLE[et]
                const active = executionType === et
                return (
                  <Chip
                    key={et}
                    label={t(`executionType.${et}`)}
                    onClick={() => setExecutionType(et)}
                    sx={{
                      fontWeight: 700,
                      bgcolor:    active ? style.color : 'transparent',
                      color:      active ? 'white'     : style.color,
                      border:     `1.5px solid ${style.color}`,
                      '&:hover':  { bgcolor: active ? style.color : `${style.color}18` },
                    }}
                  />
                )
              })}
            </Box>
          </Box>

          {/* Due Date + Duration */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={t('task.dueDate')}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              size="small"
              sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('task.durationLabel')}
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              size="small"
              sx={{ width: 140 }}
              inputProps={{ min: 1, max: 480 }}
            />
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2.5 }}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: 2.5, fontWeight: 700 }}>
          {t('common.add')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
