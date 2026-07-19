import { useState } from 'react'
import { Box, Collapse, IconButton, Stack, Tooltip, Typography } from '@mui/material'
import CheckCircleRoundedIcon            from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon   from '@mui/icons-material/RadioButtonUncheckedRounded'
import WbTwilightRoundedIcon             from '@mui/icons-material/WbTwilightRounded'
import ExpandMoreRoundedIcon             from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon             from '@mui/icons-material/ExpandLessRounded'
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
  const [expanded, setExpanded] = useState(false)

  if (routines.length === 0) return null

  const doneCount = routines.filter(r => isDoneForToday(r, today)).length
  const allDone   = doneCount === routines.length

  // Collapse to success banner only when all done AND not manually expanded for undo.
  const showChecklist = !allDone || expanded

  return (
    <Box
      sx={{
        mb: 1.5,
        borderRadius: 2,
        border: '1px solid rgba(251,191,36,0.3)',
        bgcolor: 'rgba(254,252,232,0.7)',
        overflow: 'hidden',
        '[data-theme="dark"] &': { bgcolor: 'rgba(120,90,10,0.18)' },
        '@media (prefers-color-scheme: dark)': { bgcolor: 'rgba(120,90,10,0.18)' },
      }}
    >
      {/* Section header */}
      <Stack
        direction="row"
        alignItems="center"
        gap={0.75}
        sx={{
          px: 1.25,
          py: 0.75,
          borderBottom: showChecklist ? '1px solid rgba(251,191,36,0.2)' : 'none',
        }}
      >
        <WbTwilightRoundedIcon sx={{ fontSize: 15, color: '#d97706', flexShrink: 0 }} aria-hidden="true" />

        <Typography variant="caption" fontWeight={700} sx={{ color: '#92400e', flex: 1 }}>
          {t('coach.morningRoutine.title')}
        </Typography>

        <Typography variant="caption" sx={{ color: '#b45309', fontWeight: 600, flexShrink: 0 }}>
          {t('coach.morningRoutine.progress', { done: doneCount, total: routines.length })}
        </Typography>

        {/* Expand / collapse toggle — only visible when all done */}
        {allDone && (
          <Tooltip title={expanded ? t('coach.morningRoutine.hideList') : t('coach.morningRoutine.showList')}>
            <IconButton
              size="small"
              onClick={() => setExpanded(v => !v)}
              aria-expanded={expanded}
              aria-label={expanded ? t('coach.morningRoutine.hideList') : t('coach.morningRoutine.showList')}
              sx={{ p: 0.25, ml: 0.25, color: '#b45309' }}
            >
              {expanded
                ? <ExpandLessRoundedIcon sx={{ fontSize: 15 }} />
                : <ExpandMoreRoundedIcon sx={{ fontSize: 15 }} />
              }
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {/* Success banner (visible when allDone and not expanded) */}
      {allDone && !expanded && (
        <Stack direction="row" alignItems="center" gap={0.75} sx={{ px: 1.25, py: 0.75 }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#16a34a' }} aria-hidden="true" />
          <Typography variant="caption" fontWeight={600} sx={{ color: '#15803d' }}>
            {t('coach.morningRoutine.allDone')} — {doneCount}/{routines.length}
          </Typography>
        </Stack>
      )}

      {/* Checklist — visible when not all done, or when expanded for undo */}
      <Collapse in={showChecklist}>
        <Stack spacing={0}>
          {routines.map(r => {
            const done     = isDoneForToday(r, today)
            // When expanded for undo, all items are interactive; otherwise only incomplete ones
            const canClick = !done || (allDone && expanded)

            return (
              <Stack
                key={r.id}
                role="checkbox"
                aria-checked={done}
                aria-label={r.title}
                tabIndex={canClick ? 0 : -1}
                direction="row"
                alignItems="center"
                gap={0.75}
                onKeyDown={e => canClick && (e.key === 'Enter' || e.key === ' ') && onToggle(r.id)}
                onClick={() => canClick && onToggle(r.id)}
                sx={{
                  px: 1.25,
                  py: 0.6,
                  cursor:  canClick ? 'pointer' : 'default',
                  opacity: done ? 0.6 : 1,
                  '&:hover': canClick ? { bgcolor: 'rgba(251,191,36,0.12)' } : {},
                  '&:focus-visible': { outline: '2px solid #d97706', outlineOffset: -2 },
                  borderTop: '1px solid rgba(251,191,36,0.1)',
                  '&:first-of-type': { borderTop: 'none' },
                }}
              >
                {done
                  ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#16a34a', flexShrink: 0 }} aria-hidden="true" />
                  : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16, color: '#d97706', flexShrink: 0 }} aria-hidden="true" />
                }
                <Typography
                  variant="caption"
                  sx={{
                    flex:           1,
                    fontWeight:     500,
                    textDecoration: done ? 'line-through' : 'none',
                    color:          done ? 'text.disabled' : 'text.primary',
                  }}
                >
                  {r.title}
                </Typography>
              </Stack>
            )
          })}
        </Stack>
      </Collapse>
    </Box>
  )
}
