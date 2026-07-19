import { Box, Stack, Typography } from '@mui/material'
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded'
import { useTranslation } from 'react-i18next'
import type { TaskItem } from '../../types'
import { isDoneForToday } from '../../hooks/useFocusCoach'
import HabitProgressItem from './HabitProgressItem'

interface Props {
  habits:          TaskItem[]
  today:           string
  onToggle:        (taskId: string) => void
  onToggleSubTask: (taskId: string, subId: string) => void
}

export default function OngoingHabitsSection({ habits, today, onToggle, onToggleSubTask }: Props) {
  const { t } = useTranslation()

  if (habits.length === 0) return null

  return (
    <Box
      sx={{
        mt: 1.5,
        borderRadius: 2,
        border: '1px solid rgba(16,185,129,0.25)',
        bgcolor: 'rgba(236,253,245,0.7)',
        overflow: 'hidden',
        '@media (prefers-color-scheme: dark)': { bgcolor: 'rgba(6,78,59,0.15)' },
      }}
    >
      {/* Section header */}
      <Stack
        direction="row"
        alignItems="center"
        gap={0.75}
        sx={{ px: 1.25, py: 0.75, borderBottom: '1px solid rgba(16,185,129,0.15)' }}
      >
        <AutorenewRoundedIcon sx={{ fontSize: 15, color: '#059669', flexShrink: 0 }} />
        <Typography variant="caption" fontWeight={700} sx={{ color: '#065f46', flex: 1 }}>
          {t('coach.habits.title')}
        </Typography>
      </Stack>

      {/* Habit items */}
      <Stack spacing={0}>
        {habits.map(habit => (
          <HabitProgressItem
            key={habit.id}
            task={habit}
            isDone={isDoneForToday(habit, today)}
            onToggle={onToggle}
            onToggleSubTask={onToggleSubTask}
          />
        ))}
      </Stack>
    </Box>
  )
}
