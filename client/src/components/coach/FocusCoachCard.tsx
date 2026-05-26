import { useState } from 'react'
import { useState } from 'react'
import {
  Box, Button, Card, Chip, Collapse, IconButton, LinearProgress,
  Tooltip, Typography,
} from '@mui/material'
import RefreshRoundedIcon              from '@mui/icons-material/RefreshRounded'
import SettingsRoundedIcon             from '@mui/icons-material/SettingsRounded'
import BoltRoundedIcon                 from '@mui/icons-material/BoltRounded'
import KeyboardArrowDownRounded        from '@mui/icons-material/KeyboardArrowDownRounded'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import VisibilityRoundedIcon           from '@mui/icons-material/VisibilityRounded'
import TaskPreviewDrawer               from '../tasks/TaskPreviewDrawer'
import { useTranslation }  from 'react-i18next'
import { useNavigate }     from 'react-router-dom'
import { useFocusCoach }   from '../../hooks/useFocusCoach'
import CoachSettingsPanel  from './CoachSettingsPanel'
import DailyInsightBanner  from './DailyInsightBanner'
import type { TaskItem }   from '../../types'
import { ExecutionType, Priority } from '../../types'

interface Props {
  tasks:             TaskItem[]
  onRefresh:         () => void
  onToggle?:         (taskId: string) => void
  onToggleSubTask?:  (taskId: string, subId: string) => void
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

export default function FocusCoachCard({ tasks, onRefresh, onToggle, onToggleSubTask }: Props) {
  const { t }    = useTranslation()
  const navigate = useNavigate()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [listOpen,     setListOpen]     = useState(false)
  // Focus session state
  const [focusTask, setFocusTask] = useState<TaskItem | null>(null)
  const [skippedTasks, setSkippedTasks] = useState<string[]>([])
  const [previewTask, setPreviewTask] = useState<TaskItem | null>(null)

  const {
    settings, setSettings,
    eligibleTasks,
    totalCount, completedCount, progress,
    nextTask, secondTask,
    carriedOverCount,
  } = useFocusCoach(tasks)

  const remaining = totalCount - completedCount

  // Exclude the current focus task (if any) or nextTask from the list below
  const mainTask = focusTask || nextTask
  const eligibleList = eligibleTasks.filter(t => t.id !== mainTask?.id && !skippedTasks.includes(t.id))

  // Handle focus session start
  const handleStartFocus = () => {
    if (mainTask) setFocusTask(mainTask)
  }

  // Mark as done
  const handleMarkDone = () => {
    if (focusTask && onToggle) {
      onToggle(focusTask.id)
      setFocusTask(null)
      setSkippedTasks([])
    }
  }

  // Snooze/postpone (just end focus session for now)
  const handleSnooze = () => {
    setFocusTask(null)
  }

  // Stop focus (end session, keep task in list)
  const handleStopFocus = () => {
    setFocusTask(null)
  }

  // Pick another: skip current, focus next eligible
  const handlePickAnother = () => {
    if (mainTask) setSkippedTasks(prev => [...prev, mainTask.id])
    const next = eligibleTasks.find(t => t.id !== mainTask?.id && !skippedTasks.includes(t.id))
    setFocusTask(next || null)
  }

  return (
    <Card
      sx={{
        borderRadius: 3,
        mb: 3,
        background: 'linear-gradient(135deg, #EDE9FF 0%, #F5F0FF 100%)',
        border: '1.5px solid rgba(124,92,255,0.2)',
        boxShadow: '0 2px 16px rgba(124,92,255,0.1)',
        overflow: 'hidden',
      }}
    >
      {/* ── Daily motivation banner ── */}
      {totalCount > 0 && (
        <DailyInsightBanner
          progress={progress}
          completedCount={completedCount}
          remaining={remaining}
          dailyTarget={settings.dailyTaskTarget}
          tasks={tasks}
        />
      )}

      {/* ── Carried-over reminder ── */}
      {settings.includeCarriedOver && carriedOverCount > 0 && (
        <Box sx={{
          px: 2, py: 1,
          bgcolor: '#fff7ed',
          borderBottom: '1px solid #fed7aa',
          display: 'flex', alignItems: 'center', gap: 1,
        }}>
          <Typography sx={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>🔄</Typography>
          <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 600 }}>
            {t('carryOver.coachReminder', { count: carriedOverCount })}
          </Typography>
        </Box>
      )}

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

        {/* ── Focus session or next task ── */}
        {mainTask && (
          <Box
            sx={{
              mt: 1.5, p: 1.25, borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(124,92,255,0.15)',
            }}
          >
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>
              {focusTask ? t('coach.focusSession') : t('coach.nextLabel')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* Checkbox (only if not in focus session) */}
              {!focusTask && (
                <Box
                  component="span"
                  onClick={() => onToggle?.(mainTask.id)}
                  sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, cursor: onToggle ? 'pointer' : 'default', borderRadius: '50%', '&:hover': onToggle ? { bgcolor: 'action.selected' } : {}, p: 0.25 }}
                >
                  {mainTask.isCompleted
                    ? <CheckCircleRoundedIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                    : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
                  }
                </Box>
              )}
              <Typography sx={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
                {taskEmoji(mainTask)}
              </Typography>
              {mainTask.durationMinutes && (
                <Chip
                  label={`${mainTask.durationMinutes} ${t('task.minutesShort')}`}
                  size="small"
                  icon={<BoltRoundedIcon sx={{ fontSize: '12px !important' }} />}
                  sx={{ fontSize: '0.65rem', height: 20, bgcolor: 'rgba(124,92,255,0.12)', color: 'primary.main' }}
                />
              )}
              <Typography variant="body2" fontWeight={600} sx={{ flex: 1, minWidth: 0 }} noWrap>
                {mainTask.title}
              </Typography>
              <Tooltip title={t('task.preview')}>
                <IconButton size="small" onClick={() => setPreviewTask(mainTask)}>
                  <VisibilityRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {/* Focus session actions */}
              {focusTask ? (
                <>
                  <Button size="small" variant="contained" color="success" onClick={handleMarkDone} sx={{ borderRadius: 2, fontSize: '0.7rem', px: 1.5, py: 0.5, minWidth: 0 }}>{t('coach.markDone')}</Button>
                  <Button size="small" variant="outlined" onClick={handleSnooze} sx={{ borderRadius: 2, fontSize: '0.7rem', px: 1, py: 0.5, minWidth: 0, ml: 1 }}>{t('coach.snooze')}</Button>
                  <Button size="small" variant="text" onClick={handleStopFocus} sx={{ borderRadius: 2, fontSize: '0.7rem', px: 1, py: 0.5, minWidth: 0, ml: 1 }}>{t('coach.stop')}</Button>
                </>
              ) : (
                <Button size="small" variant="contained" onClick={handleStartFocus} sx={{ borderRadius: 2, fontSize: '0.7rem', px: 1.5, py: 0.5, minWidth: 0 }}>{t('coach.start')}</Button>
              )}
            </Box>
            {/* Timer/progress placeholder */}
            {focusTask && (
              <Box sx={{ mt: 1, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="primary" fontWeight={700}>{t('coach.timerPlaceholder')}</Typography>
              </Box>
            )}
            {/* Sub-tasks of the main task */}
            {(mainTask.subTasks ?? []).length > 0 && (
              <Box sx={{ mt: 1, pl: 3.5 }}>
                {(mainTask.subTasks ?? []).map(sub => (
                  <Box key={sub.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.35 }}>
                    <Box
                      component="span"
                      onClick={() => onToggleSubTask?.(mainTask.id, sub.id)}
                      sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, cursor: onToggleSubTask ? 'pointer' : 'default', borderRadius: '50%', '&:hover': onToggleSubTask ? { bgcolor: 'action.selected' } : {}, p: 0.2 }}
                    >
                      {sub.isCompleted
                        ? <CheckCircleRoundedIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                      }
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        flex: 1, minWidth: 0,
                        textDecoration: sub.isCompleted ? 'line-through' : 'none',
                        color: sub.isCompleted ? 'text.disabled' : 'text.secondary',
                      }}
                      noWrap
                    >
                      {sub.title}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
            {/* Pick another button */}
            {!focusTask && eligibleList.length > 0 && (
              <Button size="small" variant="text" onClick={handlePickAnother} sx={{ mt: 1, borderRadius: 2, fontSize: '0.7rem', px: 1, py: 0.5, minWidth: 0 }}>{t('coach.pickAnother')}</Button>
            )}
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
        {eligibleList.length > 0 && (
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
                {t('coach.allTasks', { count: eligibleList.length })}
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
                  maxHeight: 280,
                  overflowY: 'auto',
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.55)',
                  border: '1px solid rgba(124,92,255,0.12)',
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(124,92,255,0.25)', borderRadius: 4 },
                }}
              >
                {eligibleList.map((tk, i) => (
                  <Box key={tk.id}>
                    {/* Parent task row */}
                    <Box
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        px: 1.25, py: 0.75,
                        borderBottom: '1px solid rgba(124,92,255,0.07)',
                      }}
                    >
                      {/* Checkbox */}
                      <Box
                        component="span"
                        onClick={() => onToggle?.(tk.id)}
                        sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, cursor: onToggle ? 'pointer' : 'default', borderRadius: '50%', '&:hover': onToggle ? { bgcolor: 'action.selected' } : {}, p: 0.2 }}
                      >
                        {tk.isCompleted
                          ? <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                          : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
                        }
                      </Box>

                      {/* Priority dot */}
                      <Box sx={{
                        width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
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
                        sx={{
                          flex: 1, minWidth: 0, lineHeight: 1.4,
                          color: tk.isCompleted ? 'text.disabled' : (i === 0 ? 'text.primary' : 'text.secondary'),
                          textDecoration: tk.isCompleted ? 'line-through' : 'none',
                        }}
                        noWrap
                      >
                        {tk.title}
                      </Typography>

                      {/* Sub-task count badge */}
                      {(tk.subTasks ?? []).length > 0 && (
                        <Typography variant="caption" sx={{ fontSize: '0.58rem', color: 'text.disabled', flexShrink: 0 }}>
                          {(tk.subTasks ?? []).filter(s => s.isCompleted).length}/{(tk.subTasks ?? []).length}
                        </Typography>
                      )}
                    </Box>

                    {/* Sub-task rows */}
                    {(tk.subTasks ?? []).map(sub => (
                      <Box
                        key={sub.id}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.75,
                          pl: 4, pr: 1.25, py: 0.5,
                          borderBottom: '1px solid rgba(124,92,255,0.04)',
                          bgcolor: 'rgba(255,255,255,0.35)',
                        }}
                      >
                        <Box
                          component="span"
                          onClick={() => onToggleSubTask?.(tk.id, sub.id)}
                          sx={{ display: 'flex', alignItems: 'center', flexShrink: 0, cursor: onToggleSubTask ? 'pointer' : 'default', borderRadius: '50%', '&:hover': onToggleSubTask ? { bgcolor: 'action.selected' } : {}, p: 0.2 }}
                        >
                          {sub.isCompleted
                            ? <CheckCircleRoundedIcon sx={{ fontSize: 15, color: 'success.main' }} />
                            : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                          }
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            flex: 1, minWidth: 0, fontSize: '0.68rem',
                            textDecoration: sub.isCompleted ? 'line-through' : 'none',
                            {/* Preview icon */}
                            <Tooltip title={t('task.preview')}>
                              <IconButton size="small" onClick={() => setPreviewTask(tk)}>
                                <VisibilityRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            color: sub.isCompleted ? 'text.disabled' : 'text.secondary',
                          }}
                          noWrap
                        >
                          {sub.title}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>

      {/* ── Empty states */}
      {totalCount === 0 && (
        <Box sx={{ mt: 3, textAlign: 'center', color: 'text.secondary', fontWeight: 500 }}>
          {t('coach.empty.noTasks')}
        </Box>
      )}
      {totalCount > 0 && eligibleList.length === 0 && !mainTask && (
        <Box sx={{ mt: 3, textAlign: 'center', color: 'text.secondary', fontWeight: 500 }}>
          {t('coach.empty.allDone')}
        </Box>
      )}
      {/* TODO: Add overloaded schedule state if needed */}

      {/* ── Settings panel ── */}
      <CoachSettingsPanel
        open={settingsOpen}
        settings={settings}
        onChange={setSettings}
      />
    </Card>
  )
}
  {/* Preview drawer */}
  <TaskPreviewDrawer task={previewTask} onClose={() => setPreviewTask(null)} onEdit={() => {}} />
  {/* TODO: Add overloaded schedule state if needed */
