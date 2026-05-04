import { Box, Card, CardActionArea, LinearProgress, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { PersonalList } from '../../types'

interface Props {
  list: PersonalList
  onClick?: () => void
}

export default function PersonalListCard({ list, onClick }: Props) {
  const { t } = useTranslation()

  const total   = list.items.length
  const done    = list.items.filter((i) => i.isCompleted).length
  const pct     = total > 0 ? Math.round((done / total) * 100) : 0
  const allDone = total > 0 && done === total

  return (
    <Card
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: allDone ? 'rgba(76,175,80,0.25)' : 'rgba(124,92,255,0.10)',
        boxShadow: '0 2px 10px rgba(124,92,255,0.07)',
        transition: 'box-shadow 0.2s',
        '&:hover': { boxShadow: '0 4px 16px rgba(124,92,255,0.13)' },
      }}
    >
      <CardActionArea onClick={onClick} sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>

          {/* Emoji badge */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              bgcolor: allDone ? '#E8F5E9' : '#EDE9FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 22,
            }}
          >
            {list.emoji ?? '📋'}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title + items count */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
              <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                {list.title}
              </Typography>
              <Typography
                variant="caption"
                fontWeight={700}
                sx={{ ml: 1, flexShrink: 0, color: allDone ? '#4CAF50' : 'text.secondary' }}
              >
                {t('list.progress', { done, total })}
              </Typography>
            </Box>

            {/* Progress bar */}
            {total > 0 && (
              <LinearProgress
                variant="determinate"
                value={pct}
                sx={{
                  borderRadius: 4,
                  height: 5,
                  bgcolor: allDone ? 'rgba(76,175,80,0.12)' : 'rgba(124,92,255,0.10)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: allDone ? '#4CAF50' : '#7C5CFF',
                    borderRadius: 4,
                    transition: 'transform 0.4s ease',
                  },
                }}
              />
            )}

            {/* Item count subtitle */}
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.6 }}>
              {t('list.items', { count: total })}
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  )
}
