import { useState } from 'react'
import {
  Box, Button, Card, Chip, Collapse, IconButton, LinearProgress,
  Tooltip, Typography,
} from '@mui/material'
import RefreshRoundedIcon       from '@mui/icons-material/RefreshRounded'
import SettingsRoundedIcon      from '@mui/icons-material/SettingsRounded'
import BoltRoundedIcon          from '@mui/icons-material/BoltRounded'
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded'
import { useTranslation }  from 'react-i18next'
import { useNavigate }     from 'react-router-dom'
import { useFocusCoach }   from '../../hooks/useFocusCoach'
import CoachSettingsPanel  from './CoachSettingsPanel'
import type { TaskItem }   from '../../types'
import { ExecutionType, Priority } from '../../types'

interface Props {
  tasks:     TaskItem[]
  onRefresh: () => void
}

function taskEmoji(task: TaskItem): string {
  if (task.executionType === ExecutionType.Quick || task.executionType === ExecutionType.Short) return '⚡'
  return '🐸'
}

const PRIORITY_COLOR: Record<Priority, string> = {
  [Priority.Critical]: '#ef4444',
  [Priority.High]:     '#f97316',
  [Priority.Medium]:   '#7c5cff',
  [Priority.Low]:      '#94a3b8',
}

export default function FocusCoachCard({ tasks, onRefresh }: Props) {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [listOpen,     setListOpen]     = useState(false)

  const {
    settings, setSettings,
    eligibleTasks,
    totalCount, completedCount, progress,
    nextTask, secondTask,
  } = useFocusCoach(tasks)

  const remaining = totalCount - completedCount

  return (
    <Card
      sx={{
        borderRadius: 3,
        mb: 3,
        background: 'linear-gradient(135deg, #EDE9FF 0%, #F5F0FF 100%)',
        border: '1.5px solid rgba(124,92,255,0.2)',
        boxShadow: '0 2px 16px rgba(124,92,255,0.1)',
        overflow: 'visible',
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ px: 2, pt: 2, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>

          {/* Robot avatar */}
          <Typography sx={{ fontSize: 40, lineHeight: 1, flexShrink: 0, mt: 0.25 }}>🤖</Typography>

          {/* Main content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} color="primary.main">
              {t('coach.title')}
            </Typography>

            {totalCount === 0 ? (
              <Typography variant="caption" color="text.secondary">
                {t('coach.noTasks')}
              </Typography>
            ) : (
              <>
                {/* Headline count */}
                <Typography variant="body1" fontWeight={800} sx={{ lineHeight: 1.3, mt: 0.25 }}>
                  {t('coach.headline', { count: remaining, time: settings.targetTime })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('coach.subline', { done: completedCount, total: settings.dailyTaskTarget })}
                </Typography>

                {/* Progress bar */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.75 }}>
                  <LinearProgress
                    variant="determinate"
                    value={progress}
                    sx={{
                      flex: 1, height: 8, borderRadius: 4,
                      bgcolor: 'rgba(124,92,255,0.15)',
                      '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: 'primary.main' },
                    }}
                  />
                  <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ flexShrink: 0 }}>
                    {progress}%
                  </Typography>
                </Box>
              </>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
            <Tooltip title={t('coach.refresh')}>
              <IconButton size="small" onClick={onRefresh} sx={{ p: 0.5 }}>
                <RefreshRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('coach.settings')}>
              <IconButton
                size="small"
                onClick={() => setSettingsOpen(o => !o)}
                sx={{ p: 0.5, color: settingsOpen ? 'primary.main' : 'text.secondary' }}
              >
                <SettingsRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Next task ── */}
        {nextTask && (
          <Box
            sx={{
              mt: 1.5, p: 1.25, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(124,92,255,0.15)',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
              {t('coach.nextLabel')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                {taskEmoji(nextTask)}
              </Typography>
              {nextTask.durationMinutes && (
                <Chip
                  label={`${nextTask.durationMinutes} ${t('task.minutesShort')}`}
                  size="small"
                  icon={<BoltRoundedIcon sx={{ fontSize: '12px !important' }} />}
                  sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(124,92,255,0.12)', color: 'primary.main' }}
                />
              )}
              <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
                {nextTask.title}
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={() => navigate('/tasks')}
                sx={{ flexShrink: 0, borderRadius: 2, fontSize: '0.7rem', px: 1.5, py: 0.5, minWidth: 0 }}
              >
                {t('coach.start')}
              </Button>
            </Box>
          </Box>
        )}

        {/* ── Second task preview ── */}
        {secondTask && (
          <Box
            sx={{
              mt: 1, px: 1.5, py: 0.75, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.45)',
            }}
          >
            <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
              {t('coach.afterLabel')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: 16, lineHeight: 1 }}>{taskEmoji(secondTask)}</Typography>
              {secondTask.durationMinutes && (
                <Chip
                  label={`${secondTask.durationMinutes} ${t('task.minutesShort')}`}
                  size="small"
                  sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'rgba(124,92,255,0.08)', color: 'primary.main' }}
                />
              )}
              <Typography variant="body2" color="text.secondary" noWrap sx={{ flex: 1, minWidth: 0 }}>
                {secondTask.title}
              </Typography>
            </Box>
          </Box>
        )}

        {/* ── Scrollable full task list ── */}
        {eligibleTasks.length > 2 && (
          <Box sx={{ mt: 1.25 }}>
            <Box
              onClick={() => setListOpen(o => !o)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                cursor: 'pointer', px: 0.5, py: 0.5, borderRadius: 1.5,
                '&:hover': { bgcolor: 'rgba(124,92,255,0.06)' },
              }}
            >
              <Typography variant="caption" fontWeight={700} color="primary.main">
                {t('coach.allTasks', { count: eligibleTasks.length })}
              </Typography>
              <KeyboardArrowDownRounded
                sx={{
                  fontSize: 16, color: 'primary.main',
                  transition: 'transform 0.2s',
                  transform: listOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </Box>

            <Collapse in={listOpen}>
              <Box
                sx={{
                  mt: 0.75,
                  maxHeight: 220,
                  overflowY: 'auto',
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(124,92,255,0.12)',
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(124,92,255,0.25)', borderRadius: 4 },
                }}
              >
                {eligibleTasks.map((tk, i) => (
                  <Box
                    key={tk.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      px: 1.25, py: 0.75,
                      borderBottom: i < eligibleTasks.length - 1 ? '1px solid rgba(124,92,255,0.07)' : 'none',
                    }}
                  >
                    {/* Priority dot */}
                    <Box sx={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      bgcolor: PRIORITY_COLOR[tk.priority],
                    }} />

                    {/* Time */}
                    {tk.plannedTime && (
                      <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ minWidth: 34, fontSize: '0.62rem' }}>
                        {tk.plannedTime}
                      </Typography>
                    )}

                    {/* Duration chip */}
                    {tk.durationMinutes && (
                      <Chip
                        label={`${tk.durationMinutes}m`}
                        size="small"
                        sx={{ height: 16, fontSize: '0.58rem', bgcolor: 'rgba(124,92,255,0.08)', color: 'primary.main', '& .MuiChip-label': { px: 0.6 } }}
                      />
                    )}

                    {/* Title */}
                    <Typography
                      variant="caption"
                      fontWeight={i === 0 ? 700 : 500}
                      sx={{ flex: 1, minWidth: 0, lineHeight: 1.4, color: i === 0 ? 'text.primary' : 'text.secondary' }}
                      noWrap
                    >
                      {tk.title}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>

      {/* ── Settings panel ── */}
      <CoachSettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
      />
    </Card>
  )
}
