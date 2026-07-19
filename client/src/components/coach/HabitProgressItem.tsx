import { useEffect, useRef, useState } from 'react'
import {
  Box, Button, CircularProgress, Collapse, IconButton,
  LinearProgress, Stack, Tooltip, Typography,
} from '@mui/material'
import CheckCircleRoundedIcon           from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon  from '@mui/icons-material/RadioButtonUncheckedRounded'
import ExpandMoreRoundedIcon            from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon            from '@mui/icons-material/ExpandLessRounded'
import { useTranslation } from 'react-i18next'
import type { TaskItem } from '../../types'
import { getNextIncompleteSubTask } from '../../hooks/useFocusCoach'

interface Props {
  task:             TaskItem
  isDone:           boolean
  onToggle:         (taskId: string) => void
  onToggleSubTask:  (taskId: string, subId: string) => void
}

export default function HabitProgressItem({ task, isDone, onToggle, onToggleSubTask }: Props) {
  const { t } = useTranslation()

  const subs        = task.subTasks ?? []
  const hasSubTasks = subs.length > 0
  const doneCount   = subs.filter(s => s.isCompleted).length
  const total       = subs.length
  const progress    = total > 0 ? Math.round((doneCount / total) * 100) : (isDone ? 100 : 0)

  // Prevent double-click: disable the +1 button while a request is in flight.
  // The pending flag resets when the parent updates the task prop.
  const [pending, setPending]       = useState(false)
  const [expandedSubs, setExpanded] = useState(false)
  const prevTaskRef                 = useRef(task)

  useEffect(() => {
    if (prevTaskRef.current !== task) {
      prevTaskRef.current = task
      setPending(false)
    }
  }, [task])

  function handleCompleteNext() {
    if (pending || isDone) return
    setPending(true)
    if (!hasSubTasks) {
      onToggle(task.id)
      return
    }
    const next = getNextIncompleteSubTask(task)
    if (next) {
      onToggleSubTask(task.id, next.id)
    } else {
      setPending(false)
    }
  }

  return (
    <Box
      sx={{
        px: 1.25,
        py: 0.9,
        borderTop: '1px solid rgba(16,185,129,0.12)',
        '&:first-of-type': { borderTop: 'none' },
        opacity:    isDone ? 0.65 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.75}>
        {/* Completion icon (no-subtask variant acts as simple checkbox) */}
        {!hasSubTasks && (
          <Box
            component="span"
            onClick={() => !isDone && onToggle(task.id)}
            role="checkbox"
            aria-checked={isDone}
            aria-label={task.title}
            tabIndex={isDone ? -1 : 0}
            onKeyDown={e => !isDone && (e.key === 'Enter' || e.key === ' ') && onToggle(task.id)}
            sx={{
              display: 'flex',
              cursor:  isDone ? 'default' : 'pointer',
              flexShrink: 0,
              '&:focus-visible': { outline: '2px solid #10b981', outlineOffset: 2, borderRadius: '50%' },
            }}
          >
            {isDone
              ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#10b981' }} aria-hidden="true" />
              : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16, color: '#10b981' }} aria-hidden="true" />
            }
          </Box>
        )}

        {/* Title */}
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            flex:           1,
            textDecoration: isDone ? 'line-through' : 'none',
            color:          isDone ? 'text.disabled' : 'text.primary',
          }}
        >
          {task.title}
        </Typography>

        {/* Progress counter (subtask variant) */}
        {hasSubTasks && (
          <Typography
            variant="caption"
            fontWeight={700}
            sx={{ color: isDone ? '#10b981' : '#0d9488', flexShrink: 0 }}
          >
            {t('coach.habits.progress', { done: doneCount, total })}
          </Typography>
        )}

        {/* Subtask expand/collapse toggle */}
        {hasSubTasks && (
          <Tooltip title={expandedSubs ? t('coach.habits.hideSteps') : t('coach.habits.showSteps')}>
            <IconButton
              size="small"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expandedSubs}
              aria-label={expandedSubs ? t('coach.habits.hideSteps') : t('coach.habits.showSteps')}
              sx={{ p: 0.2, color: '#059669', flexShrink: 0 }}
            >
              {expandedSubs
                ? <ExpandLessRoundedIcon sx={{ fontSize: 14 }} />
                : <ExpandMoreRoundedIcon sx={{ fontSize: 14 }} />
              }
            </IconButton>
          </Tooltip>
        )}

        {/* +1 / next-step action (hidden when done) */}
        {!isDone && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleCompleteNext}
            disabled={pending}
            aria-label={`${hasSubTasks ? t('coach.habits.plusOne') : t('coach.habits.completeNext')}: ${task.title}`}
            aria-busy={pending}
            sx={{
              minWidth: 0,
              px: 0.75,
              py: 0.1,
              fontSize:  '0.65rem',
              fontWeight: 700,
              height:    22,
              flexShrink: 0,
              borderColor: '#10b981',
              color:       '#10b981',
              '&:hover':      { bgcolor: '#d1fae5', borderColor: '#059669' },
              '&.Mui-disabled': { opacity: 0.55 },
            }}
          >
            {pending ? (
              <CircularProgress
                size={10}
                sx={{ color: 'inherit' }}
                aria-label={t('common.loading', 'טוען...')}
              />
            ) : (
              hasSubTasks ? t('coach.habits.plusOne') : t('coach.habits.completeNext')
            )}
          </Button>
        )}

        {/* Done badge */}
        {isDone && (
          <Typography
            variant="caption"
            sx={{ color: '#10b981', fontWeight: 600, flexShrink: 0, fontSize: '0.62rem' }}
          >
            ✓ {t('coach.habits.completed')}
          </Typography>
        )}
      </Stack>

      {/* Progress bar (subtask variant only) */}
      {hasSubTasks && (
        <LinearProgress
          variant="determinate"
          value={progress}
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('coach.habits.progress', { done: doneCount, total })}
          sx={{
            mt: 0.5,
            height: 4,
            borderRadius: 999,
            bgcolor: '#d1fae5',
            '& .MuiLinearProgress-bar': { bgcolor: isDone ? '#10b981' : '#34d399' },
          }}
        />
      )}

      {/* Subtask detail list (collapsed by default; expand for undo) */}
      {hasSubTasks && (
        <Collapse in={expandedSubs}>
          <Stack
            sx={{ mt: 0.75, pl: 1, borderLeft: '2px solid rgba(16,185,129,0.2)' }}
            role="list"
            aria-label={t('coach.habits.showSteps')}
          >
            {subs.map(sub => (
              <Stack
                key={sub.id}
                role="listitem"
                direction="row"
                alignItems="center"
                gap={0.5}
                onClick={() => onToggleSubTask(task.id, sub.id)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onToggleSubTask(task.id, sub.id)}
                tabIndex={0}
                aria-label={`${sub.title}${sub.isCompleted ? ' — הושלם' : ''}`}
                sx={{
                  py: 0.35,
                  cursor: 'pointer',
                  '&:focus-visible': { outline: '2px solid #10b981', outlineOffset: 1, borderRadius: 1 },
                  '&:hover': { bgcolor: 'rgba(16,185,129,0.06)', borderRadius: 1 },
                }}
              >
                {sub.isCompleted
                  ? <CheckCircleRoundedIcon sx={{ fontSize: 13, color: '#10b981', flexShrink: 0 }} aria-hidden="true" />
                  : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 13, color: '#34d399', flexShrink: 0 }} aria-hidden="true" />
                }
                <Typography
                  variant="caption"
                  sx={{
                    fontSize:       '0.67rem',
                    textDecoration: sub.isCompleted ? 'line-through' : 'none',
                    color:          sub.isCompleted ? 'text.disabled' : 'text.primary',
                  }}
                >
                  {sub.title}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Collapse>
      )}
    </Box>
  )
}
