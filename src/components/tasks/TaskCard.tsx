import {
  Box, Card, Checkbox, Chip, Collapse,
  Divider, IconButton, Typography,
} from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import ExpandMoreRoundedIcon           from '@mui/icons-material/ExpandMoreRounded'
import AccessTimeRoundedIcon           from '@mui/icons-material/AccessTimeRounded'
import CalendarTodayRoundedIcon        from '@mui/icons-material/CalendarTodayRounded'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExecutionType, Priority } from '../../types'
import type { TaskItem } from '../../types'
import SubProgressBar from './SubProgressBar'
import SubTaskList    from './SubTaskList'

// ─── colour maps ─────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<Priority, { bg: string; color: string }> = {
  [Priority.Low]:      { bg: '#E8F5E9', color: '#2E7D32' },
  [Priority.Medium]:   { bg: '#FFF8E1', color: '#F57F17' },
  [Priority.High]:     { bg: '#FFEBEE', color: '#C62828' },
  [Priority.Critical]: { bg: '#F3E5F5', color: '#6A1B9A' },
}

const EXECUTION_STYLE: Record<ExecutionType, { bg: string; color: string }> = {
  [ExecutionType.Quick]:  { bg: '#E0F7FA', color: '#00695C' },
  [ExecutionType.Short]:  { bg: '#E3F2FD', color: '#1565C0' },
  [ExecutionType.Medium]: { bg: '#FFF3E0', color: '#E65100' },
  [ExecutionType.Long]:   { bg: '#EDE9FF', color: '#5438CC' },
}

// ─── TaskChips ────────────────────────────────────────────────────────────────

function TaskChips({ task }: { task: TaskItem }) {
  const { t } = useTranslation()
  const ps = PRIORITY_STYLE[task.priority]
  const es = EXECUTION_STYLE[task.executionType]

  const chipSx = (style: { bg: string; color: string }) => ({
    height: 20,
    fontSize: '0.65rem',
    fontWeight: 700,
    bgcolor: style.bg,
    color:   style.color,
    '& .MuiChip-label': { px: 1 },
  })

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      <Chip label={t(`priority.${task.priority}`)}            size="small" sx={chipSx(ps)} />
      <Chip label={t(`executionType.${task.executionType}`)}  size="small" sx={chipSx(es)} />
    </Box>
  )
}

// ─── TaskMeta ─────────────────────────────────────────────────────────────────

function TaskMeta({ task }: { task: TaskItem }) {
  const { i18n } = useTranslation()
  const subsDone  = task.subTasks?.filter((s) => s.isCompleted).length ?? 0
  const subsTotal = task.subTasks?.length ?? 0

  const formattedDue = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(i18n.language, { day: '2-digit', month: '2-digit' })
    : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
      {(formattedDue || task.plannedTime || task.durationMinutes) && (
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {formattedDue && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <CalendarTodayRoundedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">{formattedDue}</Typography>
            </Box>
          )}
          {task.plannedTime && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <AccessTimeRoundedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.secondary">{task.plannedTime}</Typography>
            </Box>
          )}
          {task.durationMinutes && (
            <Typography variant="caption" color="text.secondary">
              {task.durationMinutes}&apos;
            </Typography>
          )}
        </Box>
      )}

      {/* mini subtask progress bar */}
      {subsTotal > 0 && <SubProgressBar done={subsDone} total={subsTotal} height={4} />}
    </Box>
  )
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

export default function TaskCard({ task }: { task: TaskItem }) {
  const [completed, setCompleted] = useState(task.isCompleted)
  const [open,      setOpen]      = useState(false)

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: completed ? 'divider' : 'rgba(124,92,255,0.12)',
        boxShadow: completed ? 'none' : '0 2px 10px rgba(124,92,255,0.07)',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* ── Main row ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', px: 1.5, pt: 1.25, pb: 1.25 }}>

        {/* Checkbox */}
        <Checkbox
          checked={completed}
          onChange={() => setCompleted((p) => !p)}
          disableRipple
          icon={<RadioButtonUncheckedRoundedIcon sx={{ color: 'text.disabled' }} />}
          checkedIcon={<CheckCircleRoundedIcon sx={{ color: 'primary.main' }} />}
          size="small"
          sx={{ mt: 0.1, p: 0.5, mr: 1 }}
        />

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <Typography
            variant="body2"
            fontWeight={completed ? 400 : 600}
            sx={{
              textDecoration: completed ? 'line-through' : 'none',
              color:          completed ? 'text.disabled' : 'text.primary',
              lineHeight: 1.4,
            }}
          >
            {task.title}
          </Typography>

          <TaskChips task={task} />
          <TaskMeta  task={task} />
        </Box>

        {/* Expand chevron — always visible, rotates smoothly */}
        <IconButton
          size="small"
          onClick={() => setOpen((p) => !p)}
          sx={{
            mt: 0.25,
            ml: 0.5,
            color: open ? 'primary.main' : 'text.disabled',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease, color 0.2s',
          }}
        >
          <ExpandMoreRoundedIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* ── Subtask panel ── */}
      <Collapse in={open} timeout={280} unmountOnExit>
        <Divider />
        <SubTaskList
          initialSubTasks={task.subTasks ?? []}
          parentCompleted={completed}
          onParentComplete={setCompleted}
        />
      </Collapse>
    </Card>
  )
}

