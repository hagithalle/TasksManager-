import { useEffect, useRef, useState } from 'react'
import {
  Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography,
} from '@mui/material'
import AddRoundedIcon    from '@mui/icons-material/AddRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import { useTranslation } from 'react-i18next'
import { tasksApi } from '../../api'
import { ExecutionType, Priority } from '../../types'
import type { Goal, TaskItem, SubTask } from '../../types'
import { PRIORITY_STYLE, EXECUTION_STYLE } from '../../utils'

export interface AddTaskDialogProps {
  open:           boolean
  onClose:        () => void
  onAdd:          (task: TaskItem) => void
  goals:          Goal[]
  userId:         string
  defaultGoalId?: string
  editTask?:      TaskItem
  onEdit?:        (task: TaskItem) => void
}

export default function AddTaskDialog({ open, onClose, onAdd, onEdit, goals, userId, defaultGoalId, editTask }: AddTaskDialogProps) {
  const { t } = useTranslation()
  const isEdit = !!editTask

  const [title,           setTitle]           = useState('')
  const [goalId,          setGoalId]          = useState<string>(defaultGoalId ?? '')
  const [priority,        setPriority]        = useState<Priority>(Priority.Medium)
  const [executionType,   setExecutionType]   = useState<ExecutionType>(ExecutionType.Short)
  const [dueDate,         setDueDate]         = useState('')
  const [plannedTime,     setPlannedTime]     = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [titleError,      setTitleError]      = useState(false)
  const [loading,         setLoading]         = useState(false)

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

  useEffect(() => {
    if (open && editTask) {
      setTitle(editTask.title)
      setGoalId(editTask.goalId ?? '')
      setPriority(editTask.priority)
      setExecutionType(editTask.executionType)
      setDueDate(editTask.dueDate ?? '')
      setPlannedTime(editTask.plannedTime ?? '')
      setDurationMinutes(editTask.durationMinutes?.toString() ?? '')
      setExistingSubs(editTask.subTasks ?? [])
      setDeletedSubIds(new Set())
      setSubTasks([])
      setTitleError(false)
    } else if (!open) {
      setTitle('')
      setGoalId(defaultGoalId ?? '')
      setPriority(Priority.Medium)
      setExecutionType(ExecutionType.Short)
      setDueDate('')
      setPlannedTime('')
      setDurationMinutes('')
      setTitleError(false)
      setSubTaskInput('')
      setSubTaskExec('')
      setSubTaskPriority('')
      setSubTaskDuration('')
      setSubTasks([])
      setExistingSubs([])
      setDeletedSubIds(new Set())
    }
  }, [open, editTask, defaultGoalId])

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
        // ג”€ג”€ Edit mode ג”€ג”€
        const updated = await tasksApi.update(editTask.id, {
          title:           title.trim(),
          goalId:          goalId || undefined,
          priority,
          executionType,
          dueDate:         dueDate || undefined,
          plannedTime:     plannedTime || undefined,
          durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
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
        // ג”€ג”€ Create mode ג”€ג”€
        const task = await tasksApi.create({
          userId,
          title:           title.trim(),
          goalId:          goalId || undefined,
          priority,
          executionType,
          dueDate:         dueDate || undefined,
          plannedTime:     plannedTime || undefined,
          durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
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
        onAdd(task)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>{isEdit ? t('task.edit', '׳¢׳¨׳™׳›׳× ׳׳©׳™׳׳”') : t('task.new')}</DialogTitle>

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
              {goals.map((g) => (
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

          {/* Due Date + Time + Duration */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              label={t('task.dueDate')}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              size="small"
              sx={{ flex: '1 1 130px' }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('task.plannedTime', '׳©׳¢׳”')}
              type="time"
              value={plannedTime}
              onChange={(e) => setPlannedTime(e.target.value)}
              size="small"
              sx={{ width: 110 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('task.durationLabel')}
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              size="small"
              sx={{ width: 100 }}
              inputProps={{ min: 1, max: 480 }}
            />
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
                  const deleted = deletedSubIds.has(st.id)
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
                      <Typography variant="body2" sx={{ flex: 1, textDecoration: st.isCompleted ? 'line-through' : 'none', color: 'text.secondary' }}>
                        {st.title}
                      </Typography>
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
                placeholder={t('task.addSubtask', '׳”׳•׳¡׳£ ׳×׳×-׳׳©׳™׳׳”...')}
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
                placeholder={t('task.durationLabel', '׳“׳§׳•׳×')}
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
                  <Typography variant="body2" color="text.secondary">ג€¢ {st.title}</Typography>
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
                      <Typography variant="caption" color="text.disabled">{st.durationMinutes}{t('task.minutesShort', '׳“׳³')}</Typography>
                    )}
                  </Box>
                </Box>
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
