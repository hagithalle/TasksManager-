import { Box, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { CoachProgress } from '../../hooks/coachProgress'
import { getEncouragementKey } from '../../hooks/coachProgress'

interface Props {
  progress: CoachProgress
}

export default function SmartCoachProgressSummary({ progress }: Props) {
  const { t } = useTranslation()

  const sections = [
    { key: 'morning', p: progress.morning, color: '#b45309' },
    { key: 'focus',   p: progress.focus,   color: '#7c5cff' },
    { key: 'habits',  p: progress.habits,  color: '#059669' },
  ].filter(s => s.p.total > 0)

  if (sections.length === 0) return null

  const msgKey = getEncouragementKey(progress)

  return (
    <Box
      sx={{
        mb: 1.5,
        px: 1.25,
        py: 0.9,
        borderRadius: 1.5,
        bgcolor: 'rgba(255,255,255,0.45)',
        border: '1px solid rgba(124,92,255,0.1)',
      }}
    >
      {/* Per-section badges */}
      <Stack
        direction="row"
        flexWrap="wrap"
        gap={1.25}
        alignItems="center"
        role="group"
        aria-label={t('coach.title')}
      >
        {sections.map(({ key, p, color }) => (
          <Stack key={key} direction="row" alignItems="baseline" gap={0.3}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontSize: '0.62rem' }}
            >
              {t(`coach.summary.${key}`)}
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color, fontSize: '0.72rem' }}
              aria-label={`${t(`coach.summary.${key}`)}: ${p.done} ${t('common.of', 'מתוך')} ${p.total}`}
            >
              {p.done}/{p.total}
            </Typography>
          </Stack>
        ))}
      </Stack>

      {/* Encouragement message */}
      <Typography
        variant="caption"
        sx={{ display: 'block', mt: 0.4, color: 'text.secondary', fontSize: '0.68rem', lineHeight: 1.35 }}
      >
        {t(`coach.summary.${msgKey}`)}
      </Typography>
    </Box>
  )
}
