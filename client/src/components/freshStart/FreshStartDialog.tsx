import { useState, useEffect, useMemo } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel, Button, Box, Typography,
  Chip, Stack, Select, MenuItem, IconButton, FormControl,
  ToggleButtonGroup, ToggleButton, CircularProgress, Alert,
  Divider, Tooltip,
} from '@mui/material'
import CloseRoundedIcon          from '@mui/icons-material/CloseRounded'
import AddRoundedIcon             from '@mui/icons-material/AddRounded'
import RemoveRoundedIcon          from '@mui/icons-material/RemoveRounded'
import { useTranslation }         from 'react-i18next'
import { useAuth }                from '../../contexts/AuthContext'
import { goalsApi }               from '../../api/goalsApi'
import { tasksApi }               from '../../api/tasksApi'
import type { Goal }              from '../../types/goal'
import type { TaskItem }          from '../../types/task'
import { DailyRole, TaskStatus }  from '../../types/enums'
import { DEFAULT_COACH_SETTINGS } from '../../hooks/focusEngine'
import type { CoachSettings }     from '../../hooks/focusEngine'

// ── Types ──────────────────────────────────────────────────────────────────────

type GoalAction  = 'keep' | 'archive' | 'complete'
type HabitAction = 'keep' | 'archive'
// TaskAction: 'keep' | 'archive' | 'move:<goalId>'
type TaskAction  = string

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  open:              boolean
  onClose:           () => void
  tasks:             TaskItem[]
  currentSettings?:  CoachSettings
  onSettingsChange?: (patch: Partial<CoachSettings>) => void
  onApplied?:        () => void
  /** Which step to start on: 0=Goals 1=Tasks 2=Habits 3=Plan. Default 0. */
  initialStep?:      number
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function ActionButton({
  label, selected, color = 'default', onClick,
}: {
  label: string; selected: boolean; color?: 'warning' | 'success' | 'default'; onClick: () => void
}) {
  return (
    <Button
      size="small"
      variant={selected ? 'contained' : 'outlined'}
      color={selected ? (color === 'default' ? 'primary' : color) : 'inherit'}
      onClick={onClick}
      sx={{
        fontSize: '0.7rem', py: 0.3, px: 1, minWidth: 0,
        ...(selected ? {} : { color: 'text.secondary', borderColor: 'divider' }),
      }}
    >
      {label}
    </Button>
  )
}

// ── Goal step ─────────────────────────────────────────────────────────────────

function GoalsStep({
  goals, actions, setAction, onBulkAction,
}: {
  goals: Goal[]
  actions: Record<string, GoalAction>
  setAction: (id: string, a: GoalAction) => void
  onBulkAction: (a: GoalAction) => void
}) {
  const { t } = useTranslation()
  if (goals.length === 0)
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('freshStart.goals.empty', 'אין יעדים פעילים לסקירה')}
        </Typography>
      </Box>
    )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Bulk actions */}
      <Stack direction="row" justifyContent="flex-end" gap={0.75} sx={{ mb: 1 }}>
        <Button
          size="small"
          variant="text"
          onClick={() => onBulkAction('keep')}
          sx={{ fontSize: '0.7rem', color: 'text.secondary', py: 0.25, minWidth: 0 }}
        >
          {t('freshStart.goals.continueAll', 'המשך הכל')}
        </Button>
        <Button
          size="small"
          variant="text"
          color="warning"
          onClick={() => onBulkAction('archive')}
          sx={{ fontSize: '0.7rem', py: 0.25, minWidth: 0 }}
        >
          {t('freshStart.goals.archiveAll', 'העבר הכל לארכיון 📦')}
        </Button>
      </Stack>
      {goals.map((g, i) => {
        const action = actions[g.id] ?? 'keep'
        return (
          <Box key={g.id}>
            {i > 0 && <Divider />}
            <Box sx={{ py: 1.5 }}>
              <Stack direction="row" alignItems="flex-start" gap={1} sx={{ mb: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{g.title}</Typography>
                  <Stack direction="row" gap={0.75} sx={{ mt: 0.3 }}>
                    {g.category && (
                      <Chip label={g.category} size="small" sx={{ height: 16, fontSize: '0.62rem' }} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {t('freshStart.goals.tasks', '{{count}} משימות', { count: g.totalTasks })}
                    </Typography>
                  </Stack>
                </Box>
              </Stack>
              <Stack direction="row" gap={0.75}>
                <ActionButton
                  label={t('freshStart.action.keep', 'המשך')}
                  selected={action === 'keep'}
                  onClick={() => setAction(g.id, 'keep')}
                />
                <ActionButton
                  label={t('freshStart.action.archive', 'ארכיב 📦')}
                  selected={action === 'archive'}
                  color="warning"
                  onClick={() => setAction(g.id, 'archive')}
                />
                <ActionButton
                  label={t('freshStart.action.complete', 'הושלם ✅')}
                  selected={action === 'complete'}
                  color="success"
                  onClick={() => setAction(g.id, 'complete')}
                />
              </Stack>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

// ── Tasks step ────────────────────────────────────────────────────────────────

function TasksStep({
  tasks, actions, setAction, goals, archivedGoalIds, moveableGoals, onBulkAction,
}: {
  tasks: TaskItem[]
  actions: Record<string, TaskAction>
  setAction: (id: string, a: TaskAction) => void
  goals: Goal[]
  archivedGoalIds: Set<string>
  moveableGoals: Goal[]
  onBulkAction: (a: 'keep' | 'archive') => void
}) {
  const { t } = useTranslation()

  // Sort: tasks with archived-goal warning first (Bug 5)
  const sorted = useMemo(() => {
    const priority = tasks.filter(t => t.goalId && archivedGoalIds.has(t.goalId))
    const rest     = tasks.filter(t => !t.goalId || !archivedGoalIds.has(t.goalId))
    return [...priority, ...rest]
  }, [tasks, archivedGoalIds])

  if (sorted.length === 0)
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('freshStart.tasks.empty', 'אין משימות פתוחות לסקירה')}
        </Typography>
      </Box>
    )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Bulk actions */}
      <Stack direction="row" justifyContent="flex-end" gap={0.75} sx={{ mb: 1 }}>
        <Button
          size="small"
          variant="text"
          onClick={() => onBulkAction('keep')}
          sx={{ fontSize: '0.7rem', color: 'text.secondary', py: 0.25, minWidth: 0 }}
        >
          {t('freshStart.tasks.keepAll', 'השאר הכל')}
        </Button>
        <Button
          size="small"
          variant="text"
          color="warning"
          onClick={() => onBulkAction('archive')}
          sx={{ fontSize: '0.7rem', py: 0.25, minWidth: 0 }}
        >
          {t('freshStart.tasks.archiveAll', 'העבר הכל לארכיון 📦')}
        </Button>
      </Stack>
      {sorted.map((task, i) => {
        const action = actions[task.id] ?? 'keep'
        const goalBeingArchived = !!task.goalId && archivedGoalIds.has(task.goalId)
        const goalName = task.goalId ? goals.find(g => g.id === task.goalId)?.title : undefined
        const isMoveAction = action.startsWith('move:')
        const moveGoalId = isMoveAction ? action.slice(5) : ''
        // Show goal-change dropdown when there are goals to move to, OR when task has a goal that can be unlinked
        const showDropdown = moveableGoals.length > 0 || !!task.goalId

        return (
          <Box key={task.id}>
            {i > 0 && <Divider />}
            <Box sx={{ py: 1.5 }}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.25 }} noWrap>
                {task.title}
              </Typography>
              {goalBeingArchived && (
                <Chip
                  label={`⚠️ ${t('freshStart.tasks.goalArchived', 'מטרה מועברת לארכיון')}: ${goalName}`}
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.62rem', mb: 0.75 }}
                />
              )}
              {!goalBeingArchived && goalName && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  🎯 {goalName}
                </Typography>
              )}
              <Stack direction="row" gap={0.75} flexWrap="wrap">
                <ActionButton
                  label={t('freshStart.action.keep', 'המשך')}
                  selected={action === 'keep'}
                  onClick={() => setAction(task.id, 'keep')}
                />
                <ActionButton
                  label={t('freshStart.action.archive', 'ארכיב 📦')}
                  selected={action === 'archive'}
                  color="warning"
                  onClick={() => setAction(task.id, 'archive')}
                />
                {showDropdown && (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      displayEmpty
                      value={action === 'unlink' ? '__unlink__' : moveGoalId}
                      onChange={e => {
                        const val = e.target.value as string
                        if (val === '__unlink__') setAction(task.id, 'unlink')
                        else if (val) setAction(task.id, `move:${val}`)
                        else setAction(task.id, 'keep')
                      }}
                      sx={{ fontSize: '0.7rem', height: 26, '.MuiSelect-select': { py: 0.3 } }}
                    >
                      <MenuItem value="" sx={{ fontSize: '0.7rem' }}>
                        {t('freshStart.tasks.changeGoal', 'שנה מטרה...')}
                      </MenuItem>
                      {task.goalId && (
                        <MenuItem value="__unlink__" sx={{ fontSize: '0.7rem' }}>
                          🚫 {t('freshStart.tasks.noGoal', 'ללא מטרה')}
                        </MenuItem>
                      )}
                      {moveableGoals.map(g => (
                        <MenuItem key={g.id} value={g.id} sx={{ fontSize: '0.7rem' }}>
                          {g.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Stack>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

// ── Habits step ───────────────────────────────────────────────────────────────

function HabitsStep({
  habits, actions, setAction,
}: {
  habits: TaskItem[]
  actions: Record<string, HabitAction>
  setAction: (id: string, a: HabitAction) => void
}) {
  const { t } = useTranslation()
  if (habits.length === 0)
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          {t('freshStart.habits.empty', 'אין הרגלים פעילים לסקירה')}
        </Typography>
      </Box>
    )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {habits.map((task, i) => {
        const action = actions[task.id] ?? 'keep'
        const roleEmoji = task.dailyRole === DailyRole.MorningRoutine ? '🌅' : '💧'
        const roleLabel = task.dailyRole === DailyRole.MorningRoutine
          ? t('freshStart.habits.routine', 'שגרת בוקר')
          : t('freshStart.habits.habit', 'הרגל')
        return (
          <Box key={task.id}>
            {i > 0 && <Divider />}
            <Box sx={{ py: 1.5 }}>
              <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: 16, flexShrink: 0 }}>{roleEmoji}</Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>{task.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{roleLabel}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" gap={0.75}>
                <ActionButton
                  label={t('freshStart.action.keep', 'המשך')}
                  selected={action === 'keep'}
                  onClick={() => setAction(task.id, 'keep')}
                />
                <ActionButton
                  label={t('freshStart.action.stop', 'עצור')}
                  selected={action === 'archive'}
                  color="warning"
                  onClick={() => setAction(task.id, 'archive')}
                />
              </Stack>
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

// ── Plan step ─────────────────────────────────────────────────────────────────

function PlanStep({
  settings, onChange,
  summary,
}: {
  settings: CoachSettings
  onChange: (patch: Partial<CoachSettings>) => void
  summary: { goals: number; complete: number; tasks: number; movedTasks: number; unlinkedTasks: number; habits: number }
}) {
  const { t } = useTranslation()
  const hasChanges = summary.goals + summary.complete + summary.tasks + summary.movedTasks + summary.unlinkedTasks + summary.habits > 0

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* Max tasks */}
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          {t('freshStart.plan.maxTasks', 'כמה משימות ביום?')}
        </Typography>
        <Stack direction="row" alignItems="center" gap={1}>
          <IconButton
            size="small"
            onClick={() => onChange({ maxTasks: Math.max(1, settings.maxTasks - 1) })}
            disabled={settings.maxTasks <= 1}
          >
            <RemoveRoundedIcon fontSize="small" />
          </IconButton>
          <Typography variant="h6" fontWeight={700} sx={{ minWidth: 32, textAlign: 'center' }}>
            {settings.maxTasks}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onChange({ maxTasks: Math.min(10, settings.maxTasks + 1) })}
            disabled={settings.maxTasks >= 10}
          >
            <AddRoundedIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            {t('freshStart.plan.maxTasksHint', 'מקסימום משימות ממוקדות')}
          </Typography>
        </Stack>
      </Box>

      {/* Target time */}
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          {t('freshStart.plan.targetTime', 'שעת יעד לסיום')}
        </Typography>
        <input
          type="time"
          value={settings.targetTime}
          onChange={e => onChange({ targetTime: e.target.value })}
          style={{
            fontSize: '1rem', padding: '6px 10px', borderRadius: 6,
            border: '1px solid #ccc', background: 'transparent', color: 'inherit',
          }}
        />
      </Box>

      {/* Energy mode */}
      <Box>
        <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
          {t('freshStart.plan.energyMode', 'מצב אנרגיה')}
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={settings.energyMode}
          onChange={(_, v) => { if (v) onChange({ energyMode: v }) }}
        >
          {(['auto', 'morning', 'afternoon', 'evening'] as const).map(mode => (
            <ToggleButton key={mode} value={mode} sx={{ fontSize: '0.7rem', py: 0.5, px: 1.25 }}>
              {mode === 'auto'      ? `⚡ ${t('coach.energy.auto', 'אוטו')}` :
               mode === 'morning'   ? `🌅 ${t('coach.energy.morning', 'בוקר')}` :
               mode === 'afternoon' ? `☀️ ${t('coach.energy.afternoon', 'צהריים')}` :
                                      `🌙 ${t('coach.energy.evening', 'ערב')}`}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Summary */}
      {hasChanges && (
        <Box sx={{ pt: 1 }}>
          <Divider sx={{ mb: 1.5 }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.75, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('freshStart.plan.summary', 'סיכום שינויים')}
          </Typography>
          <Stack gap={0.4}>
            {summary.goals > 0 && (
              <Typography variant="caption" color="text.secondary">
                📦 {t('freshStart.summary.archived', '{{count}} מועברים לארכיון', { count: summary.goals })} ({t('freshStart.summary.goals', 'יעדים')})
              </Typography>
            )}
            {summary.complete > 0 && (
              <Typography variant="caption" color="text.secondary">
                ✅ {t('freshStart.summary.completed', '{{count}} מסומנים כהושלמו', { count: summary.complete })} ({t('freshStart.summary.goals', 'יעדים')})
              </Typography>
            )}
            {summary.tasks > 0 && (
              <Typography variant="caption" color="text.secondary">
                📦 {t('freshStart.summary.archived', '{{count}} מועברים לארכיון', { count: summary.tasks })} ({t('freshStart.summary.tasks', 'משימות')})
              </Typography>
            )}
            {summary.movedTasks > 0 && (
              <Typography variant="caption" color="text.secondary">
                🔄 {t('freshStart.summary.moved', '{{count}} משימות מועברות למטרה חדשה', { count: summary.movedTasks })}
              </Typography>
            )}
            {summary.unlinkedTasks > 0 && (
              <Typography variant="caption" color="text.secondary">
                🔓 {t('freshStart.summary.unlinked', '{{count}} משימות ללא מטרה', { count: summary.unlinkedTasks })}
              </Typography>
            )}
            {summary.habits > 0 && (
              <Typography variant="caption" color="text.secondary">
                ⏸️ {t('freshStart.summary.stopped', '{{count}} הרגלים נעצרים', { count: summary.habits })}
              </Typography>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  )
}

// ── Main dialog ────────────────────────────────────────────────────────────────

export default function FreshStartDialog({
  open, onClose, tasks,
  currentSettings  = DEFAULT_COACH_SETTINGS,
  onSettingsChange = () => {},
  onApplied        = () => {},
  initialStep      = 0,
}: Props) {
  const { t }    = useTranslation()
  const { user } = useAuth()

  const [step,    setStep]    = useState(initialStep)
  const [goals,   setGoals]   = useState<Goal[]>([])
  const [loading,  setLoading]  = useState(false)
  const [applying, setApplying] = useState(false)
  const [applied,  setApplied]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const [goalActions,  setGoalActionsState]  = useState<Record<string, GoalAction>>({})
  const [taskActions,  setTaskActionsState]  = useState<Record<string, TaskAction>>({})
  const [habitActions, setHabitActionsState] = useState<Record<string, HabitAction>>({})
  const [draftSettings, setDraftSettings]   = useState<CoachSettings>(currentSettings)

  // Reset when dialog opens
  useEffect(() => {
    if (!open) return
    setStep(initialStep)
    setApplied(false)
    setGoalActionsState({})
    setTaskActionsState({})
    setHabitActionsState({})
    setDraftSettings(currentSettings)
    setError(null)

    if (!user) return
    setLoading(true)
    goalsApi.getByUser(user.id)
      .then(all => setGoals(all.filter(g => !g.isCompleted && !g.isArchived)))
      .catch(() => setError(t('error.loadFailed', 'שגיאה בטעינת הנתונים')))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user, initialStep])

  // Derived task lists
  const reviewTasks = useMemo(() =>
    tasks.filter(t =>
      (t.taskStatus === TaskStatus.Open || t.taskStatus === TaskStatus.CarriedOver) &&
      (!t.dailyRole || t.dailyRole === DailyRole.Focus) &&
      !t.isCompleted
    ), [tasks])

  const reviewHabits = useMemo(() =>
    tasks.filter(t =>
      (t.dailyRole === DailyRole.MorningRoutine || t.dailyRole === DailyRole.OngoingHabit) &&
      t.taskStatus !== TaskStatus.Archived &&
      t.taskStatus !== TaskStatus.Missed
    ), [tasks])

  const archivedGoalIds = useMemo(() =>
    new Set(Object.entries(goalActions).filter(([, a]) => a === 'archive').map(([id]) => id)),
    [goalActions])

  // Goals still selectable as move-to targets: not being archived and not being completed
  const moveableGoals = useMemo(() =>
    goals.filter(g => goalActions[g.id] !== 'archive' && goalActions[g.id] !== 'complete'),
    [goals, goalActions])

  // Summary counts for plan step
  const summary = useMemo(() => ({
    goals:         Object.values(goalActions).filter(a => a === 'archive').length,
    complete:      Object.values(goalActions).filter(a => a === 'complete').length,
    tasks:         Object.values(taskActions).filter(a => a === 'archive').length,
    movedTasks:    Object.values(taskActions).filter(a => a.startsWith('move:')).length,
    unlinkedTasks: Object.values(taskActions).filter(a => a === 'unlink').length,
    habits:        Object.values(habitActions).filter(a => a === 'archive').length,
  }), [goalActions, taskActions, habitActions])

  // Action setters
  const setGoalAction  = (id: string, a: GoalAction)  => setGoalActionsState(p  => ({ ...p, [id]: a }))
  const setTaskAction  = (id: string, a: TaskAction)   => setTaskActionsState(p  => ({ ...p, [id]: a }))
  const setHabitAction = (id: string, a: HabitAction)  => setHabitActionsState(p => ({ ...p, [id]: a }))

  const setBulkGoalAction = (a: GoalAction) =>
    setGoalActionsState(Object.fromEntries(goals.map(g => [g.id, a])))

  const setBulkTaskAction = (a: 'keep' | 'archive') =>
    setTaskActionsState(Object.fromEntries(reviewTasks.map(t => [t.id, a])))

  const updateDraftSettings = (patch: Partial<CoachSettings>) =>
    setDraftSettings(prev => ({ ...prev, ...patch }))

  // Apply all changes
  async function applyChanges() {
    setApplying(true)
    setError(null)
    try {
      await Promise.all(
        Object.entries(goalActions).map(([id, action]) => {
          if (action === 'archive') return goalsApi.update(id, { isArchived: true })
          if (action === 'complete') return goalsApi.update(id, { isCompleted: true })
          return Promise.resolve()
        })
      )
      await Promise.all([
        ...Object.entries(taskActions).map(([id, action]) => {
          if (action === 'archive') return tasksApi.update(id, { status: 'archived' })
          if (action === 'unlink') return tasksApi.update(id, { clearGoalId: true })
          if (action.startsWith('move:')) return tasksApi.update(id, { goalId: action.slice(5) })
          return Promise.resolve()
        }),
        ...Object.entries(habitActions).map(([id, action]) => {
          if (action === 'archive') return tasksApi.update(id, { status: 'archived' })
          return Promise.resolve()
        }),
      ])
      onSettingsChange(draftSettings)
      setApplied(true)
    } catch {
      setError(t('freshStart.applyError', 'שגיאה בהחלת השינויים. נסה שוב.'))
    } finally {
      setApplying(false)
    }
  }

  // Called from both the "Build" button and X-close on the success screen
  function handleBuildPlan() {
    onApplied()
    onClose()
  }

  const STEPS = [
    t('freshStart.step.goals', 'יעדים'),
    t('freshStart.step.tasks', 'משימות'),
    t('freshStart.step.habits', 'הרגלים'),
    t('freshStart.step.plan', 'תכנון'),
  ]
  const isLast = step === STEPS.length - 1

  return (
    <Dialog
      open={open}
      onClose={applying ? undefined : applied ? handleBuildPlan : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>
            🔄 {t('freshStart.title', 'ארגון מחדש')}
          </Typography>
          <Tooltip title={t('common.close', 'סגור')}>
            <IconButton
              size="small"
              onClick={applied ? handleBuildPlan : onClose}
              disabled={applying}
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
        {!applied && (
          <Typography variant="caption" color="text.secondary">
            {t('freshStart.subtitle', 'סקור את המצב הנוכחי ועדכן את התכנית לתקופה החדשה')}
          </Typography>
        )}
      </DialogTitle>

      {/* ── Success state ── */}
      {applied ? (
        <>
          <DialogContent dividers>
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography sx={{ fontSize: 48, mb: 2 }}>✨</Typography>
              <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
                {t('freshStart.success.title', 'הדף החדש שלך מוכן')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('freshStart.success.subtitle', 'כל השינויים הוחלו. לחץ למטה כדי שה-Smart Coach יבנה עבורך תכנון מעודכן.')}
              </Typography>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              onClick={handleBuildPlan}
              sx={{ px: 4, fontWeight: 700 }}
            >
              🎯 {t('freshStart.success.buildPlan', 'בנה לי תכנון חדש')}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <Box sx={{ px: 3, pb: 1 }}>
            <Stepper activeStep={step} alternativeLabel>
              {STEPS.map(label => (
                <Step key={label}>
                  <StepLabel sx={{ '.MuiStepLabel-label': { fontSize: '0.7rem' } }}>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <DialogContent dividers sx={{ minHeight: 200, maxHeight: 420, overflowY: 'auto' }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <>
                {step === 0 && (
                  <GoalsStep
                    goals={goals}
                    actions={goalActions}
                    setAction={setGoalAction}
                    onBulkAction={setBulkGoalAction}
                  />
                )}
                {step === 1 && (
                  <TasksStep
                    tasks={reviewTasks}
                    actions={taskActions}
                    setAction={setTaskAction}
                    goals={goals}
                    archivedGoalIds={archivedGoalIds}
                    moveableGoals={moveableGoals}
                    onBulkAction={setBulkTaskAction}
                  />
                )}
                {step === 2 && (
                  <HabitsStep
                    habits={reviewHabits}
                    actions={habitActions}
                    setAction={setHabitAction}
                  />
                )}
                {step === 3 && (
                  <PlanStep
                    settings={draftSettings}
                    onChange={updateDraftSettings}
                    summary={summary}
                  />
                )}
              </>
            )}
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 1.5, gap: 1 }}>
            {step > 0 && (
              <Button
                variant="outlined"
                onClick={() => setStep(s => s - 1)}
                disabled={applying}
                sx={{ mr: 'auto' }}
              >
                {t('common.back', 'חזרה')}
              </Button>
            )}
            {!isLast && (
              <Button
                variant="contained"
                onClick={() => setStep(s => s + 1)}
                disabled={loading}
              >
                {t('freshStart.next', 'הבא')}
              </Button>
            )}
            {isLast && (
              <Button
                variant="contained"
                color="primary"
                onClick={applyChanges}
                disabled={applying}
                startIcon={applying ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                {applying
                  ? t('freshStart.applying', 'מחיל שינויים...')
                  : t('freshStart.apply', 'החל שינויים')}
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  )
}
