import { useEffect, useRef, useState } from 'react'
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography,
} from '@mui/material'
import NoteAltRoundedIcon from '@mui/icons-material/NoteAltRounded'
import AddRoundedIcon     from '@mui/icons-material/AddRounded'
import DeleteRoundedIcon  from '@mui/icons-material/DeleteRounded'
import EditRoundedIcon    from '@mui/icons-material/EditRounded'
import { useTranslation } from 'react-i18next'
import { tasksApi, goalsApi } from '../../api'
import { ExecutionType, GoalCategory, GoalType, Priority, RecurrenceType, TaskNature } from '../../types'
import type { Goal, TaskItem, SubTask } from '../../types'
import { PRIORITY_STYLE, EXECUTION_STYLE } from '../../utils'

const NEW_GOAL_SENTINEL = '__new__'

function computeEndTime(start: string, durationMins: number | null): string {
  if (!start || !durationMins) return ''
  const [h, m] = start.split(':').map(Number)
  const total = h * 60 + m + durationMins
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

function computeDuration(start: string, end: string): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const diff = (eh * 60 + em) - (sh * 60 + sm)
  return diff > 0 ? diff : null
}

// ─── Smart notes suggestion helpers ──────────────────────────────────────────

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^\u0590-\u05ffa-z0-9\s]/g, '').trim()
}

function titleSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeTitle(a).split(/\s+/).filter((w) => w.length > 1))
  const wb = new Set(normalizeTitle(b).split(/\s+/).filter((w) => w.length > 1))
  if (wa.size === 0 || wb.size === 0) return 0
  let matches = 0
  for (const w of wa) if (wb.has(w)) matches++
  return matches / Math.max(wa.size, wb.size)
}

function findNotesSuggestion(title: string, tasks: TaskItem[], excludeId?: string): TaskItem | null {
  const norm = normalizeTitle(title)
  if (norm.length < 2) return null
  const candidates = tasks.filter((t) => t.id !== excludeId && t.notes && t.notes.trim().length > 0)
  const scored = candidates
    .map((t) => ({ t, score: titleSimilarity(title, t.title) }))
    .filter((x) => x.score >= 0.4)
    .sort((a, b) => {
      // prefer completed then by score
      const diff = (b.t.isCompleted ? 1 : 0) - (a.t.isCompleted ? 1 : 0)
      return diff !== 0 ? diff : b.score - a.score
    })
  return scored[0]?.t ?? null
}

export interface AddTaskDialogProps {
  open:           boolean
  onClose:        () => void
  onAdd?:         (task: TaskItem) => void
  onGoalCreated?: (goal: Goal) => void
  goals?:         Goal[]
  userId?:        string
  defaultGoalId?: string
  defaultTitle?:  string
  editTask?:      TaskItem
  onEdit?:        (task: TaskItem) => void
  /** All tasks — used for smart notes recall */
  allTasks?:      TaskItem[]
}

export default function AddTaskDialog({ open, onClose, onAdd, onEdit, onGoalCreated, goals, userId, defaultGoalId, defaultTitle, editTask, allTasks }: AddTaskDialogProps) {
  const { t } = useTranslation()
  const isEdit = !!editTask

  const [title,           setTitle]           = useState('')
  const [notes,           setNotes]           = useState('')
  const [goalId,          setGoalId]          = useState<string>(defaultGoalId ?? '')
  const [newGoalMode,     setNewGoalMode]     = useState(false)
  const [newGoalTitle,    setNewGoalTitle]    = useState('')
  const [newGoalCategory, setNewGoalCategory] = useState<GoalCategory>(GoalCategory.Personal)
  const [newGoalSaving,   setNewGoalSaving]   = useState(false)
  const [priority,        setPriority]        = useState<Priority>(Priority.Medium)
  const [executionType,   setExecutionType]   = useState<ExecutionType>(ExecutionType.Short)
  const [dueDate,         setDueDate]         = useState('')
  const [plannedTime,     setPlannedTime]     = useState('')
  const [endTime,         setEndTime]         = useState('')
  const [durationMinutes,       setDurationMinutes]       = useState('')
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number | ''>('')
  const [recurrenceType,        setRecurrenceType]        = useState<RecurrenceType>(RecurrenceType.None)
  const [recurrenceInterval, setRecurrenceInterval] = useState(1)
  const [taskNature,      setTaskNature]      = useState<TaskNature>(TaskNature.Action)
  const [titleError,      setTitleError]      = useState(false)
  const [loading,         setLoading]         = useState(false)

  // Smart notes suggestion
  const [noteSuggestion,        setNoteSuggestion]        = useState<TaskItem | null>(null)
  const [dismissedSuggestionId, setDismissedSuggestionId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // existing sub-tasks (edit mode)
  const [existingSubs,    setExistingSubs]    = useState<SubTask[]>([])
  const [deletedSubIds,   setDeletedSubIds]   = useState<Set<string>>(new Set())

  // new sub-tasks being added
  const [subTaskInput,     setSubTaskInput]     = useState('')
  const [subTaskExec,      setSubTaskExec]      = useState<ExecutionType | ''>('')
  const [subTaskPriority,  setSubTaskPriority]  = useState<Priority | ''>('')
  const [subTaskDuration,  setSubTaskDuration]  = useState('')
  const [subTasks,         setSubTasks]         = useState<Array<{
    title: string; executionType?: ExecutionType; priority?: Priority; durationMinutes?: number
  }>>([])
  const subInputRef = useRef<HTMLInputElement>(null)

  // inline editing for saved subtasks
  const [editingSubId,    setEditingSubId]    = useState<string | null>(null)
  const [editingSubTitle, setEditingSubTitle] = useState('')

  // Debounced title → smart notes suggestion (new task mode only)
  useEffect(() => {
    const excludeTaskId = editTask?.id   // capture before guard narrowing
    if (!allTasks || isEdit || !open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const suggestion = findNotesSuggestion(title, allTasks, excludeTaskId)
      setNoteSuggestion(suggestion)
    }, 500)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, allTasks, open])

  useEffect(() => {
    if (open && editTask) {
      setTitle(editTask.title)
      setNotes(editTask.notes ?? '')
      setGoalId(editTask.goalId ?? '')
      setPriority(editTask.priority)
      setExecutionType(editTask.executionType)
      setDueDate(editTask.dueDate ?? '')
      setPlannedTime(editTask.plannedTime ?? '')
      setDurationMinutes(editTask.durationMinutes?.toString() ?? '')
      setEndTime(computeEndTime(editTask.plannedTime ?? '', editTask.durationMinutes ?? null))
      setReminderOffsetMinutes(editTask.reminderOffsetMinutes ?? '')
      setRecurrenceType(editTask.recurrenceType ?? RecurrenceType.None)
      setRecurrenceInterval(editTask.recurrenceInterval ?? 1)
      setTaskNature((editTask.taskNature as TaskNature) ?? TaskNature.Action)
      setExistingSubs(editTask.subTasks ?? [])
      setDeletedSubIds(new Set())
      setSubTasks([])
      setTitleError(false)
    } else if (open && !editTask) {
      setTitle(defaultTitle ?? '')
      setNotes('')
      setGoalId(defaultGoalId ?? '')
      setNewGoalMode(false)
      setNewGoalTitle('')
      setNewGoalCategory(GoalCategory.Personal)
      setPriority(Priority.Medium)
      setExecutionType(ExecutionType.Short)
      setDueDate('')
      setPlannedTime('')
      setEndTime('')
      setDurationMinutes('')
      setReminderOffsetMinutes('')
      setRecurrenceType(RecurrenceType.None)
      setRecurrenceInterval(1)
      setTaskNature(TaskNature.Action)
      setTitleError(false)
      setSubTaskInput('')
      setSubTaskExec('')
      setSubTaskPriority('')
      setSubTaskDuration('')
      setSubTasks([])
      setExistingSubs([])
      setDeletedSubIds(new Set())
      setEditingSubId(null)
      setEditingSubTitle('')
      setNoteSuggestion(null)
      setDismissedSuggestionId(null)
    } else if (!open) {
      setTitle('')
      setNotes('')
      setGoalId(defaultGoalId ?? '')
      setPriority(Priority.Medium)
      setExecutionType(ExecutionType.Short)
      setDueDate('')
      setPlannedTime('')
      setEndTime('')
      setDurationMinutes('')
      setReminderOffsetMinutes('')
      setRecurrenceType(RecurrenceType.None)
      setRecurrenceInterval(1)
      setTaskNature(TaskNature.Action)
      setTitleError(false)
      setSubTaskInput('')
      setSubTaskExec('')
      setSubTaskPriority('')
      setSubTaskDuration('')
      setSubTasks([])
      setExistingSubs([])
      setDeletedSubIds(new Set())
    }
  }, [open, editTask, defaultGoalId, defaultTitle])

  function addSubTask() {
    const v = subTaskInput.trim()
    if (!v) return
    setSubTasks((prev) => [...prev, {
      title: v,
      executionType:   subTaskExec   || undefined,
      priority:        subTaskPriority || undefined,
      durationMinutes: subTaskDuration ? Number(subTaskDuration) : undefined,
    }])
    setSubTaskInput('')
    setSubTaskExec('')
    setSubTaskPriority('')
    setSubTaskDuration('')
    subInputRef.current?.focus()
  }

  function removeSubTask(idx: number) {
    setSubTasks((prev) => prev.filter((_, i) => i !== idx))
  }

  function toggleDeleteExisting(subId: string) {
    setDeletedSubIds((prev) => {
      const next = new Set(prev)
      next.has(subId) ? next.delete(subId) : next.add(subId)
      return next
    })
  }

  async function handleSubmit() {
    if (!title.trim()) { setTitleError(true); return }
    setLoading(true)
    try {
      if (isEdit && editTask) {
        // ג"€ג"€ Edit mode ג"€ג"€
        const updated = await tasksApi.update(editTask.id, {
          title:                title.trim(),
          notes:                notes.trim() || undefined,
          goalId:               goalId || undefined,
          priority,
          executionType,
          dueDate:              dueDate || undefined,
          plannedTime:          plannedTime || undefined,
          durationMinutes:      durationMinutes ? Number(durationMinutes) : undefined,
          reminderOffsetMinutes: reminderOffsetMinutes !== '' ? reminderOffsetMinutes : undefined,
          recurrenceType:       recurrenceType,
          recurrenceInterval:   recurrenceInterval,
          nature:               taskNature,
        })
        // Delete removed sub-tasks
        for (const id of deletedSubIds) {
          await tasksApi.deleteSubTask(id)
        }
        // Add new sub-tasks
        const addedSubs: SubTask[] = []
        for (const st of subTasks) {
          const sub = await tasksApi.addSubTask(editTask.id, {
            title:           st.title,
            executionType:   st.executionType,
            priority:        st.priority,
            durationMinutes: st.durationMinutes,
          })
          addedSubs.push(sub)
        }
        const finalTask: TaskItem = {
          ...updated,
          subTasks: [
            ...(existingSubs.filter(s => !deletedSubIds.has(s.id))),
            ...addedSubs,
          ],
        }
        onEdit?.(finalTask)
      } else {
        // ג"€ג"€ Create mode ג"€ג"€
        const task = await tasksApi.create({
          userId: userId!,
          title:                title.trim(),
          notes:                notes.trim() || undefined,
          goalId:               goalId || undefined,
          priority,
          executionType,
          dueDate:              dueDate || undefined,
          plannedTime:          plannedTime || undefined,
          durationMinutes:      durationMinutes ? Number(durationMinutes) : undefined,
          reminderOffsetMinutes: reminderOffsetMinutes !== '' ? reminderOffsetMinutes : undefined,
          recurrenceType:       recurrenceType,
          recurrenceInterval:   recurrenceInterval,
          nature:               taskNature,
        })
        for (const st of subTasks) {
          const sub = await tasksApi.addSubTask(task.id, {
            title:           st.title,
            executionType:   st.executionType,
            priority:        st.priority,
            durationMinutes: st.durationMinutes,
          })
          task.subTasks = [...(task.subTasks ?? []), sub]
        }
        onAdd?.(task)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? t('task.edit', '׳¢׳¨׳™׳›׳× ׳׳©׳™׳׳"') : t('task.new')}</DialogTitle>

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

          {/* Notes */}
          <TextField
            label={t('task.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            size="small"
            placeholder={t('task.notesPlaceholder')}
          />

          {/* Smart notes suggestion */}
          {noteSuggestion && noteSuggestion.id !== dismissedSuggestionId && (
            <Alert
              icon={<NoteAltRoundedIcon fontSize="small" />}
              severity="info"
              sx={{ py: 0.5, '& .MuiAlert-message': { width: '100%' } }}
              onClose={() => setDismissedSuggestionId(noteSuggestion.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ flex: 1 }}>
                  {t('task.notesSuggestion')}: <strong>{noteSuggestion.title}</strong>
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  color="info"
                  sx={{ fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 0, whiteSpace: 'nowrap' }}
                  onClick={() => {
                    setNotes(noteSuggestion.notes!)
                    setDismissedSuggestionId(noteSuggestion.id)
                  }}
                >
                  {t('task.applyNotes')}
                </Button>
              </Box>
            </Alert>
          )}

          {/* Goal */}
          <FormControl fullWidth size="small">
            <InputLabel>{t('nav.goals')}</InputLabel>
            <Select
              value={newGoalMode ? NEW_GOAL_SENTINEL : goalId}
              onChange={(e) => {
                if (e.target.value === NEW_GOAL_SENTINEL) {
                  setNewGoalMode(true)
                  setNewGoalTitle('')
                } else {
                  setNewGoalMode(false)
                  setGoalId(e.target.value)
                }
              }}
              label={t('nav.goals')}
            >
              <MenuItem value="">{t('task.noGoal')}</MenuItem>
              {(goals ?? []).map((g) => (
                <MenuItem key={g.id} value={g.id}>{g.title}</MenuItem>
              ))}
              <MenuItem value={NEW_GOAL_SENTINEL} sx={{ color: 'primary.main', fontWeight: 700 }}>
                + {t('goal.createNew', 'מטרה חדשה')}
              </MenuItem>
            </Select>
          </FormControl>

          {/* Inline new goal form */}
          {newGoalMode && (
            <Box sx={{ border: '1.5px solid', borderColor: 'primary.light', borderRadius: 2, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="caption" fontWeight={700} color="primary.main">{t('goal.createNew', 'מטרה חדשה')}</Typography>
              <TextField
                label={t('goal.title', 'כותרת מטרה')}
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                size="small"
                fullWidth
                autoFocus
              />
              <FormControl fullWidth size="small">
                <InputLabel>{t('goal.category', 'קטגוריה')}</InputLabel>
                <Select
                  value={newGoalCategory}
                  onChange={(e) => setNewGoalCategory(e.target.value as GoalCategory)}
                  label={t('goal.category', 'קטגוריה')}
                >
                  {Object.values(GoalCategory).map((cat) => (
                    <MenuItem key={cat} value={cat}>{t(`goalCategory.${cat}`, cat)}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button size="small" onClick={() => { setNewGoalMode(false); setGoalId('') }}>{t('common.cancel')}</Button>
                <Button
                  size="small"
                  variant="contained"
                  disabled={!newGoalTitle.trim() || newGoalSaving}
                  startIcon={newGoalSaving ? <CircularProgress size={14} /> : undefined}
                  onClick={async () => {
                    if (!userId || !newGoalTitle.trim()) return
                    setNewGoalSaving(true)
                    try {
                      const created = await goalsApi.create({
                        userId,
                        title: newGoalTitle.trim(),
                        category: newGoalCategory,
                        goalType: GoalType.Finite,
                      })
                      onGoalCreated?.(created)
                      setGoalId(created.id)
                      setNewGoalMode(false)
                    } finally {
                      setNewGoalSaving(false)
                    }
                  }}
                >{t('common.add')}</Button>
              </Box>
            </Box>
          )}

          {/* Task Nature */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              {t('taskNature.label')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {([
                { value: TaskNature.Action,      icon: '🔨' },
                { value: TaskNature.Meeting,     icon: '📅' },
                { value: TaskNature.Appointment, icon: '🏥' },
              ] as const).map(({ value, icon }) => {
                const active = taskNature === value
                return (
                  <Chip
                    key={value}
                    label={`${icon} ${t(`taskNature.${value}`)}`}
                    onClick={() => setTaskNature(value)}
                    sx={{
                      fontWeight: 700,
                      bgcolor:    active ? '#0369a1' : 'transparent',
                      color:      active ? 'white'   : '#0369a1',
                      border:     '1.5px solid #0369a1',
                      '&:hover':  { bgcolor: active ? '#0369a1' : '#e0f2fe' },
                    }}
                  />
                )
              })}
            </Box>
          </Box>

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

          {/* Due Date */}
          <TextField
            label={t('task.dueDate')}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
          />

          {/* Time range: from X to Y */}
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <TextField
              label={t('task.fromTime', 'משעה')}
              type="time"
              value={plannedTime}
              onChange={(e) => {
                setPlannedTime(e.target.value)
                if (e.target.value && endTime) {
                  const dur = computeDuration(e.target.value, endTime)
                  setDurationMinutes(dur != null ? String(dur) : '')
                } else if (e.target.value && durationMinutes) {
                  setEndTime(computeEndTime(e.target.value, Number(durationMinutes)))
                }
              }}
              size="small"
              sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>—</Typography>
            <TextField
              label={t('task.toTime', 'עד שעה')}
              type="time"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value)
                const dur = computeDuration(plannedTime, e.target.value)
                setDurationMinutes(dur != null ? String(dur) : '')
              }}
              size="small"
              sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Reminder offset */}
          <FormControl fullWidth size="small">
            <InputLabel>{t('reminder.label', 'תזכורת')}</InputLabel>
            <Select
              value={reminderOffsetMinutes}
              onChange={(e) => setReminderOffsetMinutes(e.target.value === '' ? '' : Number(e.target.value))}
              label={t('reminder.label', 'תזכורת')}
            >
              <MenuItem value="">{t('reminder.none', 'ללא תזכורת')}</MenuItem>
              {([
                { key: '15min',  value: 15    },
                { key: '30min',  value: 30    },
                { key: '1hour',  value: 60    },
                { key: '2hours', value: 120   },
                { key: '1day',   value: 1440  },
                { key: '2days',  value: 2880  },
                { key: '1week',  value: 10080 },
              ] as const).map(({ key, value }) => (
                <MenuItem key={key} value={value}>{t(`reminder.${key}`)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Recurrence */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              {t('recurrence.label', 'חזרה')}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
              {([RecurrenceType.None, RecurrenceType.Daily, RecurrenceType.Weekly, RecurrenceType.Monthly] as RecurrenceType[]).map((rt) => (
                <Chip
                  key={rt}
                  label={t(`recurrence.${rt}`, rt)}
                  onClick={() => setRecurrenceType(rt)}
                  sx={{
                    fontWeight: 700,
                    bgcolor:   recurrenceType === rt ? 'primary.main' : 'transparent',
                    color:     recurrenceType === rt ? 'white' : 'text.primary',
                    border:    '1.5px solid',
                    borderColor: recurrenceType === rt ? 'primary.main' : 'divider',
                  }}
                />
              ))}
            </Box>
            {recurrenceType !== RecurrenceType.None && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="body2" color="text.secondary">{t('recurrence.interval')}</Typography>
                <TextField
                  type="number"
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(Math.max(1, Number(e.target.value)))}
                  size="small"
                  sx={{ width: 72 }}
                  inputProps={{ min: 1, max: 365 }}
                />
                <Typography variant="body2" color="text.secondary">{t(`recurrence.${recurrenceType}`)}</Typography>
              </Box>
            )}
          </Box>

          {/* Sub-tasks */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, display: 'block' }}>
              {t('task.subtasks', '׳×׳×׳™-׳׳©׳™׳׳•׳×')}
            </Typography>

            {/* Existing sub-tasks (edit mode) */}
            {existingSubs.length > 0 && (
              <Box sx={{ mb: 1 }}>
                {existingSubs.map((st) => {
                  const deleted  = deletedSubIds.has(st.id)
                  const isEditing = editingSubId === st.id
                  return (
                    <Box key={st.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, opacity: deleted ? 0.4 : 1 }}>
                      <Checkbox
                        size="small"
                        checked={st.isCompleted}
                        onChange={async () => {
                          await tasksApi.updateSubTask(st.id, { isCompleted: !st.isCompleted })
                          setExistingSubs(prev => prev.map(s => s.id === st.id ? { ...s, isCompleted: !s.isCompleted } : s))
                        }}
                      />
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editingSubTitle}
                          onChange={(e) => setEditingSubTitle(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const v = editingSubTitle.trim()
                              if (v && v !== st.title) {
                                await tasksApi.updateSubTask(st.id, { title: v })
                                setExistingSubs(prev => prev.map(s => s.id === st.id ? { ...s, title: v } : s))
                              }
                              setEditingSubId(null)
                            }
                            if (e.key === 'Escape') setEditingSubId(null)
                          }}
                          onBlur={async () => {
                            const v = editingSubTitle.trim()
                            if (v && v !== st.title) {
                              await tasksApi.updateSubTask(st.id, { title: v })
                              setExistingSubs(prev => prev.map(s => s.id === st.id ? { ...s, title: v } : s))
                            }
                            setEditingSubId(null)
                          }}
                          autoFocus
                          sx={{ flex: 1 }}
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ flex: 1, textDecoration: st.isCompleted ? 'line-through' : 'none', color: 'text.secondary', cursor: 'text' }}
                          onDoubleClick={() => { setEditingSubId(st.id); setEditingSubTitle(st.title) }}
                        >
                          {st.title}
                        </Typography>
                      )}
                      {!isEditing && (
                        <IconButton size="small" onClick={() => { setEditingSubId(st.id); setEditingSubTitle(st.title) }}>
                          <EditRoundedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                        </IconButton>
                      )}
                      <IconButton size="small" onClick={() => toggleDeleteExisting(st.id)}>
                        <DeleteRoundedIcon sx={{ fontSize: 16, color: deleted ? 'error.main' : 'text.disabled' }} />
                      </IconButton>
                    </Box>
                  )
                })}
              </Box>
            )}

            {/* Sub-task input row */}
            <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
              <TextField
                inputRef={subInputRef}
                size="small"
                fullWidth
                placeholder={t('task.addSubtask', '׳"׳•׳¡׳£ ׳×׳×-׳׳©׳™׳׳"...')}
                value={subTaskInput}
                onChange={(e) => setSubTaskInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubTask() } }}
              />
              <IconButton onClick={addSubTask} color="primary" disabled={!subTaskInput.trim()}>
                <AddRoundedIcon />
              </IconButton>
            </Box>

            {/* Sub-task execution type chips */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
              {([ExecutionType.Quick, ExecutionType.Short, ExecutionType.Medium, ExecutionType.Long] as ExecutionType[]).map((et) => {
                const style  = EXECUTION_STYLE[et]
                const active = subTaskExec === et
                return (
                  <Chip key={et} size="small" label={t(`executionType.${et}`)}
                    onClick={() => setSubTaskExec(active ? '' : et)}
                    sx={{
                      fontSize: '0.65rem', height: 22,
                      bgcolor:  active ? style.color : 'transparent',
                      color:    active ? 'white' : style.color,
                      border:   `1px solid ${style.color}`,
                    }}
                  />
                )
              })}
            </Box>

            {/* Sub-task priority + duration */}
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.5, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                {([Priority.Low, Priority.Medium, Priority.High, Priority.Critical] as Priority[]).map((p) => {
                  const style  = PRIORITY_STYLE[p]
                  const active = subTaskPriority === p
                  return (
                    <Chip key={p} size="small" label={t(`priority.${p}`)}
                      onClick={() => setSubTaskPriority(active ? '' : p)}
                      sx={{
                        fontSize: '0.65rem', height: 22,
                        bgcolor:  active ? style.color : 'transparent',
                        color:    active ? 'white' : style.color,
                        border:   `1px solid ${style.color}`,
                      }}
                    />
                  )
                })}
              </Box>
              <TextField
                size="small"
                type="number"
                placeholder={t('task.durationLabel', '׳"׳§׳•׳×')}
                value={subTaskDuration}
                onChange={(e) => setSubTaskDuration(e.target.value)}
                sx={{ width: 90 }}
                inputProps={{ min: 1, max: 480 }}
              />
            </Box>

            {/* New sub-tasks being added */}
            {subTasks.map((st, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, pl: 0.5 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" color="text.secondary">{'· '}{st.title}</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
                    {st.executionType && (
                      <Chip size="small" label={t(`executionType.${st.executionType}`)}
                        sx={{ height: 18, fontSize: '0.6rem', bgcolor: EXECUTION_STYLE[st.executionType]?.color + '22', color: EXECUTION_STYLE[st.executionType]?.color }} />
                    )}
                    {st.priority && (
                      <Chip size="small" label={t(`priority.${st.priority}`)}
                        sx={{ height: 18, fontSize: '0.6rem', bgcolor: PRIORITY_STYLE[st.priority]?.color + '22', color: PRIORITY_STYLE[st.priority]?.color }} />
                    )}
                    {st.durationMinutes && (
                      <Typography variant="caption" color="text.disabled">{st.durationMinutes}{t('task.minutesShort')}</Typography>
                    )}
                  </Box>
                </Box>
                <IconButton size="small" title={t('common.edit')} onClick={() => {
                  setSubTaskInput(st.title)
                  setSubTaskExec(st.executionType ?? '')
                  setSubTaskPriority(st.priority ?? '')
                  setSubTaskDuration(st.durationMinutes?.toString() ?? '')
                  removeSubTask(idx)
                  subInputRef.current?.focus()
                }}>
                  <EditRoundedIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                </IconButton>
                <IconButton size="small" onClick={() => removeSubTask(idx)}>
                  <DeleteRoundedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2.5 }} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button onClick={handleSubmit} variant="contained" sx={{ borderRadius: 2.5, fontWeight: 700 }} disabled={loading}>
          {isEdit ? t('common.save', '׳©׳׳•׳¨') : t('common.add')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
