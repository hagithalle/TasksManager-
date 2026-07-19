import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material'
import CheckCircleRoundedIcon     from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
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

  const subs       = task.subTasks ?? []
  const hasSubTasks = subs.length > 0
  const doneCount  = subs.filter(s => s.isCompleted).length
  const total      = subs.length
  const progress   = total > 0 ? Math.round((doneCount / total) * 100) : (isDone ? 100 : 0)

  function handleCompleteNext() {
    if (!hasSubTasks) {
      onToggle(task.id)
      return
    }
    const next = getNextIncompleteSubTask(task)
    if (next) onToggleSubTask(task.id, next.id)
  }

  return (
    <Box
      sx={{
        px: 1.25,
        py: 0.9,
        borderTop: '1px solid rgba(16,185,129,0.12)',
        '&:first-of-type': { borderTop: 'none' },
        opacity: isDone ? 0.65 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      <Stack direction="row" alignItems="center" gap={0.75}>
        {/* Completion icon (no-subtask variant acts as checkbox) */}
        {!hasSubTasks && (
          <Box
            component="span"
            onClick={() => !isDone && onToggle(task.id)}
            sx={{ display: 'flex', cursor: isDone ? 'default' : 'pointer', flexShrink: 0 }}
          >
            {isDone
              ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#10b981' }} />
              : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16, color: '#10b981' }} />
            }
          </Box>
        )}

        {/* Title */}
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            flex: 1,
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? 'text.disabled' : 'text.primary',
          }}
        >
          {task.title}
        </Typography>

        {/* Progress counter (subtask variant) */}
        {hasSubTasks && (
          <Typography variant="caption" fontWeight={700} sx={{ color: isDone ? '#10b981' : '#0d9488', flexShrink: 0 }}>
            {t('coach.habits.progress', { done: doneCount, total })}
          </Typography>
        )}

        {/* +1 / action button */}
        {!isDone && (
          <Button
            size="small"
            variant="outlined"
            onClick={handleCompleteNext}
            sx={{
              minWidth: 0,
              px: 0.75,
              py: 0.1,
              fontSize: '0.65rem',
              fontWeight: 700,
              height: 22,
              flexShrink: 0,
              borderColor: '#10b981',
              color: '#10b981',
              '&:hover': { bgcolor: '#d1fae5', borderColor: '#059669' },
            }}
          >
            {hasSubTasks ? t('coach.habits.plusOne') : t('coach.habits.completeNext')}
          </Button>
        )}

        {isDone && (
          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 600, flexShrink: 0, fontSize: '0.62rem' }}>
            ✓ {t('coach.habits.completed')}
          </Typography>
        )}
      </Stack>

      {/* Progress bar (subtask variant only) */}
      {hasSubTasks && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            mt: 0.5,
            height: 4,
            borderRadius: 999,
            bgcolor: '#d1fae5',
            '& .MuiLinearProgress-bar': { bgcolor: isDone ? '#10b981' : '#34d399' },
          }}
        />
      )}
    </Box>
  )
}
