import { Box, Card, Chip, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { DayStatus } from '../../hooks/useStreak'

interface Props {
  streak: number
  last7:  DayStatus[]
}

function streakMessage(streak: number, t: (k: string, o?: object) => string): string {
  if (streak === 0) return t('streak.msgZero')
  if (streak === 1) return t('streak.msgOne')
  if (streak < 4)  return t('streak.msgFew',  { count: streak })
  if (streak < 8)  return t('streak.msgWeek', { count: streak })
  return t('streak.msgLong', { count: streak })
}

export default function StreakCard({ streak, last7 }: Props) {
  const { t } = useTranslation()

  return (
    <Card
      sx={{
        borderRadius: 3,
        p: 2,
        background: 'linear-gradient(135deg, #FFF8E1 0%, #FFFDE7 100%)',
        border: '1.5px solid rgba(255,152,0,0.2)',
        boxShadow: '0 2px 12px rgba(255,152,0,0.08)',
        flex: 1,
        minWidth: 0,
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
        <Typography sx={{ fontSize: 22, lineHeight: 1 }}>🔥</Typography>
        <Typography variant="body2" fontWeight={700} color="warning.dark">
          {t('streak.title')}
        </Typography>
      </Box>

      {/* Count */}
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mb: 0.5 }}>
        <Typography variant="h4" fontWeight={800} color="warning.dark" lineHeight={1}>
          {streak}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('streak.days')}
        </Typography>
      </Box>

      {/* Motivational message */}
      <Typography variant="caption" color="text.secondary" display="block" mb={1.25}>
        {streakMessage(streak, t)}
      </Typography>

      {/* Day indicators */}
      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'space-between' }}>
        {last7.map((d) => (
          <Box
            key={d.dateStr}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.4,
            }}
          >
            <Box
              sx={{
                width:  28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: d.isActive
                  ? 'warning.main'
                  : d.isToday
                    ? 'rgba(255,152,0,0.12)'
                    : 'rgba(0,0,0,0.06)',
                border: d.isToday && !d.isActive ? '2px solid' : 'none',
                borderColor: 'warning.main',
                transition: 'background-color 0.2s',
              }}
            >
              {d.isActive ? (
                <Typography sx={{ fontSize: 14, lineHeight: 1 }}>✓</Typography>
              ) : (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: d.isToday ? 'warning.main' : 'rgba(0,0,0,0.2)',
                  }}
                />
              )}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                fontWeight: d.isToday ? 700 : 400,
                color: d.isToday ? 'warning.dark' : 'text.disabled',
              }}
            >
              {d.label}
            </Typography>
          </Box>
        ))}
      </Box>
    </Card>
  )
}
