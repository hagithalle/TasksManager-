import {
  Box, Checkbox, Divider, IconButton, InputBase,
  List, ListItem, ListItemIcon, Typography, TextField,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import AddRoundedIcon                  from '@mui/icons-material/AddRounded'
import PlaylistAddCheckRoundedIcon     from '@mui/icons-material/PlaylistAddCheckRounded'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { SubTask } from '../../types'
import { mockLists } from '../../data'
import SubProgressBar from './SubProgressBar'

// ─── LinkedListButton ─────────────────────────────────────────────────────────

function LinkedListButton({ listId }: { listId: string }) {
  const navigate = useNavigate()
  const list = mockLists.find((l) => l.id === listId)
  if (!list) return null
  return (
    <Box
      component="span"
      onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigate(`/lists/${listId}`) }}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.4,
        cursor: 'pointer',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: 'primary.main',
        bgcolor: 'rgba(124,92,255,0.08)',
        px: 0.75,
        py: 0.2,
        borderRadius: 1.5,
        mt: 0.3,
        '&:hover': { bgcolor: 'rgba(124,92,255,0.16)' },
        transition: 'background-color 0.15s',
      }}
    >
      {list.emoji ?? '📋'} {list.title}
    </Box>
  )
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeId() {
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ─── props ───────────────────────────────────────────────────────────────────

interface Props {
  /** Initial subtask list (from task data) */
  initialSubTasks:  SubTask[]
  /** Whether the parent task is currently marked completed */
  parentCompleted:  boolean
  /** Notified when the parent task's completion should change */
  onParentComplete: (completed: boolean) => void
}

// ─── component ───────────────────────────────────────────────────────────────

export default function SubTaskList({
  initialSubTasks,
  parentCompleted,
  onParentComplete,
}: Props) {
  const { t } = useTranslation()

  const [subTasks,    setSubTasks]    = useState<SubTask[]>(initialSubTasks)
  const [addingNew,   setAddingNew]   = useState(false)
  const [newTitle,    setNewTitle]    = useState('')
  const [newDuration, setNewDuration] = useState('')
  const [editIdx,     setEditIdx]     = useState<number | null>(null)
  const [editTitle,   setEditTitle]   = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const done  = subTasks.filter((s) => s.isCompleted).length
  const total = subTasks.length

  // ── When parent is marked complete → tick all subs ──────────────────────
  useEffect(() => {
    if (parentCompleted) {
      setSubTasks((prev) => prev.map((s) => ({ ...s, isCompleted: true })))
    }
  }, [parentCompleted])

  // ── Focus input when add row opens ───────────────────────────────────────
  useEffect(() => {
    if (addingNew) inputRef.current?.focus()
  }, [addingNew])

  // ── Toggle individual subtask ─────────────────────────────────────────────
  function toggleSub(id: string) {
    const updated = subTasks.map((s) =>
      s.id === id ? { ...s, isCompleted: !s.isCompleted } : s,
    )
    setSubTasks(updated)

    // if all are now done → complete the parent
    const allDone = updated.length > 0 && updated.every((s) => s.isCompleted)
    if (allDone) onParentComplete(true)

    // if one was un-ticked while parent was completed → un-complete parent
    if (!updated.find((s) => s.id === id)?.isCompleted && parentCompleted) {
      onParentComplete(false)
    }
  }

  // ── Add new subtask ───────────────────────────────────────────────────────
  function commitAdd() {
    const title = newTitle.trim()
    const duration = newDuration.trim() ? Number(newDuration) : undefined
    const dueDate = newDueDate.trim() || undefined
    if (title) {
      setSubTasks((prev) => [...prev, { id: makeId(), title, isCompleted: false, durationMinutes: duration, dueDate }])
    }
    setNewTitle('')
    setNewDuration('')
    setNewDueDate('')
    setAddingNew(false)
  }

  function startEdit(idx: number, sub: SubTask) {
    setEditIdx(idx)
    setEditTitle(sub.title)
    setEditDuration(sub.durationMinutes?.toString() ?? '')
    setEditDueDate(sub.dueDate ?? '')
  }

  function saveEdit(idx: number) {
    setSubTasks(prev => prev.map((s, i) => i === idx ? { ...s, title: editTitle.trim(), durationMinutes: editDuration.trim() ? Number(editDuration) : undefined, dueDate: editDueDate || undefined } : s))
    setEditIdx(null)
    setEditTitle('')
    setEditDuration('')
    setEditDueDate('')
  }

  return (
    <Box>
      {/* ── Header: progress bar ── */}
      {total > 0 && (
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.4 }}>
              {t('task.subtasks')}
            </Typography>
          </Box>
          <SubProgressBar done={done} total={total} height={4} showLabel />
        </Box>
      )}

      {total > 0 && <Divider />}

      {/* ── Empty state ── */}
      {total === 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 2.5, px: 2, gap: 0.75, opacity: 0.55 }}>
          <PlaylistAddCheckRoundedIcon sx={{ fontSize: 32, color: 'text.disabled' }} />
          <Typography variant="caption" color="text.disabled" textAlign="center">
            {t('task.noSubtasks')}
          </Typography>
        </Box>
      )}

      {/* ── Subtask rows ── */}
      {total > 0 && (
        <List disablePadding sx={{ bgcolor: 'rgba(124,92,255,0.025)' }}>
          {subTasks.map((sub, index) => (
            <Box key={sub.id}>
              {index > 0 && <Divider sx={{ ml: 6 }} />}
              <ListItem disablePadding sx={{ px: 1.5, py: 0.25, alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Checkbox
                    edge="start"
                    checked={sub.isCompleted}
                    onChange={() => toggleSub(sub.id)}
                    disableRipple
                    icon={
                      <RadioButtonUncheckedRoundedIcon
                        sx={{ fontSize: 18, color: 'text.disabled' }}
                      />
                    }
                    checkedIcon={
                      <CheckCircleRoundedIcon
                        sx={{ fontSize: 18, color: 'primary.main' }}
                      />
                    }
                    size="small"
                  />
                </ListItemIcon>
                {editIdx === index ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TextField
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        size="small"
                        sx={{ flex: 2, fontSize: '0.82rem' }}
                        inputProps={{ maxLength: 60 }}
                      />
                      <TextField
                        value={editDuration}
                        onChange={e => setEditDuration(e.target.value.replace(/[^\d]/g, ''))}
                        size="small"
                        sx={{ width: 70 }}
                        placeholder={t('task.minutesShort')}
                        inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 0 }}
                      />
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={e => setEditDueDate(e.target.value)}
                        style={{ height: 32, fontSize: '0.82rem', borderRadius: 4, border: '1px solid #ccc', padding: '0 8px' }}
                      />
                      <IconButton size="small" onClick={() => saveEdit(index)}>
                        <SaveIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          textDecoration: sub.isCompleted ? 'line-through' : 'none',
                          color:          sub.isCompleted ? 'text.disabled' : 'text.secondary',
                          fontSize: '0.82rem',
                          flex: 2,
                        }}
                      >
                        {sub.title}
                      </Typography>
                      <Typography variant="caption" color="primary.main" sx={{ minWidth: 40, textAlign: 'right' }}>
                        {sub.durationMinutes ? `${sub.durationMinutes} ${t('task.minutesShort')}` : ''}
                      </Typography>
                      <IconButton size="small" onClick={() => startEdit(index, sub)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    {sub.linkedListId && (
                      <Box sx={{ mt: 0.25 }}>
                        <LinkedListButton listId={sub.linkedListId} />
                      </Box>
                    )}
                  </Box>
                )}
              </ListItem>
            </Box>
          ))}
        </List>
      )}

      {/* ── Add new subtask row ── */}
      {addingNew ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            py: 0.75,
            borderTop: total > 0 ? '1px solid' : 'none',
            borderColor: 'divider',
            bgcolor: 'rgba(124,92,255,0.03)',
            gap: 1,
          }}
        >
          <RadioButtonUncheckedRoundedIcon
            sx={{ fontSize: 18, color: 'text.disabled', mr: 1, flexShrink: 0 }}
          />
          <InputBase
            inputRef={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter')  commitAdd()
              if (e.key === 'Escape') { setAddingNew(false); setNewTitle(''); setNewDuration('') }
            }}
            onBlur={commitAdd}
            placeholder={t('task.subtaskPlaceholder')}
            sx={{ fontSize: '0.82rem', color: 'text.primary', flex: 2 }}
          />
          <TextField
            value={newDuration}
            onChange={e => setNewDuration(e.target.value.replace(/[^\d]/g, ''))}
            size="small"
            placeholder={t('task.minutesShort')}
            sx={{ width: 70 }}
            inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', min: 0 }}
          />
          <input
            type="date"
            value={newDueDate}
            onChange={e => setNewDueDate(e.target.value)}
            style={{ height: 32, fontSize: '0.82rem', borderRadius: 4, border: '1px solid #ccc', padding: '0 8px' }}
          />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 1.5,
            py: 0.75,
            borderTop: total > 0 ? '1px solid' : 'none',
            borderColor: 'divider',
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' },
            borderRadius: total > 0 ? '0 0 12px 12px' : '12px',
          }}
          onClick={() => setAddingNew(true)}
        >
          <IconButton size="small" sx={{ p: 0, mr: 1, color: 'primary.main' }} tabIndex={-1}>
            <AddRoundedIcon fontSize="small" />
          </IconButton>
          <Typography variant="caption" color="primary.main" fontWeight={600}>
            {t('task.addSubtask')}
          </Typography>
        </Box>
      )}
    </Box>
  )
}
