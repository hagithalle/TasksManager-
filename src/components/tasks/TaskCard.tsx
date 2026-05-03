import {
  Box, Card, Checkbox, Chip, Collapse,
  Divider, IconButton, List, ListItem,
  ListItemIcon, ListItemText, Typography,
} from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import ExpandMoreRoundedIcon           from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon           from '@mui/icons-material/ExpandLessRounded'
import AccessTimeRoundedIcon           from '@mui/icons-material/AccessTimeRounded'
import CalendarTodayRoundedIcon        from '@mui/icons-material/CalendarTodayRounded'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExecutionType, Priority } from '../../types'
import type { TaskItem } from '../../types'

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

// ─── props ───────────────────────────────────────────────────────────────────

interface Props {
  task:             TaskItem
  /** Called when the main checkbox is clicked */
  onToggle?:        (taskId: string) => void
  /** Called when a sub-task checkbox is clicked */
  onSubTaskToggle?: (taskId: string, subTaskId: string) => void
}

// ─── component ───────────────────────────────────────────────────────────────

export default function TaskCard({ task, onToggle, onSubTaskToggle }: Props) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const hasSubs      = (task.subTasks?.length ?? 0) > 0
  const subsDone     = task.subTasks?.filter((s) => s.isCompleted).length ?? 0
  const subsTotal    = task.subTasks?.length ?? 0

  const priorityStyle   = PRIORITY_STYLE[task.priority]
  const executionStyle  = EXECUTION_STYLE[task.executionType]

  const formattedDue = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString(i18n.language, {
        day: '2-digit', month: '2-digit',
      })
    : null

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: task.isCompleted ? 'divider' : 'rgba(124,92,255,0.12)',
        boxShadow: task.isCompleted
          ? 'none'
          : '0 2px 10px rgba(124,92,255,0.07)',
        transition: 'box-shadow 0.2s',
      }}
    >
      {/* ── Main row ── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', px: 1.5, pt: 1.25, pb: hasSubs ? 0.75 : 1.25 }}>

        {/* Checkbox */}
        <Checkbox
          checked={task.isCompleted}
          onChange={() => onToggle?.(task.id)}
          disableRipple
          icon={<RadioButtonUncheckedRoundedIcon sx={{ color: 'text.disabled' }} />}
          checkedIcon={<CheckCircleRoundedIcon sx={{ color: 'primary.main' }} />}
          size="small"
          sx={{ mt: 0.1, p: 0.5, mr: 1 }}
        />

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>

          {/* Title */}
          <Typography
            variant="body2"
            fontWeight={task.isCompleted ? 400 : 600}
            sx={{
              textDecoration: task.isCompleted ? 'line-through' : 'none',
              color:          task.isCompleted ? 'text.disabled' : 'text.primary',
              mb: 0.75,
              lineHeight: 1.4,
            }}
          >
            {task.title}
          </Typography>

          {/* Chips row */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
            {/* Priority */}
            <Chip
              label={t(`priority.${task.priority}`)}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: priorityStyle.bg,
                color:   priorityStyle.color,
                '& .MuiChip-label': { px: 1 },
              }}
            />

            {/* Execution type */}
            <Chip
              label={t(`executionType.${task.executionType}`)}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 600,
                bgcolor: executionStyle.bg,
                color:   executionStyle.color,
                '& .MuiChip-label': { px: 1 },
              }}
            />
          </Box>

          {/* Meta row: due date · planned time · subtasks */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
            {formattedDue && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <CalendarTodayRoundedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">
                  {formattedDue}
                </Typography>
              </Box>
            )}

            {task.plannedTime && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                <AccessTimeRoundedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
                <Typography variant="caption" color="text.secondary">
                  {task.plannedTime}
                </Typography>
              </Box>
            )}

            {hasSubs && (
              <Typography variant="caption" color={subsDone === subsTotal ? 'primary.main' : 'text.secondary'} fontWeight={subsDone === subsTotal ? 700 : 400}>
                {subsDone}/{subsTotal}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Expand button */}
        {hasSubs && (
          <IconButton
            size="small"
            onClick={() => setOpen((p) => !p)}
            sx={{ mt: 0.25, ml: 0.5, color: 'text.disabled' }}
          >
            {open
              ? <ExpandLessRoundedIcon fontSize="small" />
              : <ExpandMoreRoundedIcon fontSize="small" />}
          </IconButton>
        )}
      </Box>

      {/* ── Sub-tasks ── */}
      {hasSubs && (
        <Collapse in={open}>
          <Divider />
          <List disablePadding sx={{ bgcolor: 'rgba(124,92,255,0.03)', pb: 0.5 }}>
            {task.subTasks!.map((sub) => (
              <ListItem key={sub.id} disablePadding sx={{ px: 1.5, py: 0.2 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Checkbox
                    edge="start"
                    checked={sub.isCompleted}
                    onChange={() => onSubTaskToggle?.(task.id, sub.id)}
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
                        color:          sub.isCompleted ? 'text.disabled' : 'text.secondary',
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
    </Card>
  )
}
