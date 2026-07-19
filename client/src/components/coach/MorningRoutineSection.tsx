import { Box, Stack, Typography } from '@mui/material'
import CheckCircleRoundedIcon     from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import WbTwilightRoundedIcon from '@mui/icons-material/WbTwilightRounded'
import { useTranslation } from 'react-i18next'
import type { TaskItem } from '../../types'
import { isDoneForToday } from '../../hooks/useFocusCoach'

interface Props {
  routines: TaskItem[]
  today:    string
  onToggle: (taskId: string) => void
}

export default function MorningRoutineSection({ routines, today, onToggle }: Props) {
  const { t } = useTranslation()

  if (routines.length === 0) return null

  const doneCount = routines.filter(r => isDoneForToday(r, today)).length
  const allDone   = doneCount === routines.length

  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: 2,
        border: '1px solid rgba(251,191,36,0.3)',
        bgcolor: 'rgba(254,252,232,0.7)',
        overflow: 'hidden',
        '.dark-mode &, [data-theme="dark"] &': { bgcolor: 'rgba(120,90,10,0.15)' },
        '@media (prefers-color-scheme: dark)': { bgcolor: 'rgba(120,90,10,0.15)' },
      }}
    >
      {/* Section header */}
      <Stack
        direction="row"
        alignItems="center"
        gap={0.75}
        sx={{ px: 1.25, py: 0.75, borderBottom: allDone ? 'none' : '1px solid rgba(251,191,36,0.2)' }}
      >
        <WbTwilightRoundedIcon sx={{ fontSize: 15, color: '#d97706', flexShrink: 0 }} />
        <Typography variant="caption" fontWeight={700} sx={{ color: '#92400e', flex: 1 }}>
          {t('coach.morningRoutine.title')}
        </Typography>
        <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 600 }}>
          {allDone
            ? t('coach.morningRoutine.progress', { done: doneCount, total: routines.length })
            : t('coach.morningRoutine.progress', { done: doneCount, total: routines.length })
          }
        </Typography>
      </Stack>

      {allDone ? (
        /* ── Success state ── */
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ px: 1.25, py: 0.75 }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#16a34a' }} />
          <Typography variant="caption" fontWeight={600} sx={{ color: '#15803d' }}>
            {t('coach.morningRoutine.allDone')} — {doneCount}/{routines.length}
          </Typography>
        </Stack>
      ) : (
        /* ── Checklist ── */
        <Stack spacing={0}>
          {routines.map(r => {
            const done = isDoneForToday(r, today)
            return (
              <Stack
                key={r.id}
                direction="row"
                alignItems="center"
                gap={0.75}
                sx={{
                  px: 1.25,
                  py: 0.6,
                  cursor: done ? 'default' : 'pointer',
                  opacity: done ? 0.6 : 1,
                  '&:hover': done ? {} : { bgcolor: 'rgba(251,191,36,0.12)' },
                  borderTop: '1px solid rgba(251,191,36,0.1)',
                  '&:first-of-type': { borderTop: 'none' },
                }}
                onClick={() => !done && onToggle(r.id)}
              >
                {done
                  ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#16a34a', flexShrink: 0 }} />
                  : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16, color: '#d97706', flexShrink: 0 }} />
                }
                <Typography
                  variant="caption"
                  sx={{
                    flex: 1,
                    fontWeight: 500,
                    textDecoration: done ? 'line-through' : 'none',
                    color: done ? 'text.disabled' : 'text.primary',
                  }}
                >
                  {r.title}
                </Typography>
              </Stack>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
