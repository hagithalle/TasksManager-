import {
  Box, Checkbox, Divider, IconButton, InputBase,
  List, ListItem, ListItemIcon, ListItemText, Typography,
} from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import AddRoundedIcon                  from '@mui/icons-material/AddRounded'
import PlaylistAddCheckRoundedIcon     from '@mui/icons-material/PlaylistAddCheckRounded'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SubTask } from '../../types'
import SubProgressBar from './SubProgressBar'

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
    if (title) {
      setSubTasks((prev) => [...prev, { id: makeId(), title, isCompleted: false }])
    }
    setNewTitle('')
    setAddingNew(false)
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
              <ListItem disablePadding sx={{ px: 1.5, py: 0.25 }}>
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
                <ListItemText
                  primary={
                    <Typography
                      variant="body2"
                      sx={{
                        textDecoration: sub.isCompleted ? 'line-through' : 'none',
                        color:          sub.isCompleted ? 'text.disabled' : 'text.secondary',
                        fontSize: '0.82rem',
                      }}
                    >
                      {sub.title}
                    </Typography>
                  }
                />
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
              if (e.key === 'Escape') { setAddingNew(false); setNewTitle('') }
            }}
            onBlur={commitAdd}
            placeholder={t('task.subtaskPlaceholder')}
            fullWidth
            sx={{ fontSize: '0.82rem', color: 'text.primary' }}
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
