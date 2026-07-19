import { useState } from 'react'
import {
  Box, Button, Card, Chip, IconButton, LinearProgress,
  Stack, Tooltip, Typography,
} from '@mui/material'
import RefreshRoundedIcon        from '@mui/icons-material/RefreshRounded'
import SettingsRoundedIcon        from '@mui/icons-material/SettingsRounded'
import BoltRoundedIcon            from '@mui/icons-material/BoltRounded'
import CheckCircleRoundedIcon     from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import VisibilityRoundedIcon      from '@mui/icons-material/VisibilityRounded'
import NavigateNextRoundedIcon    from '@mui/icons-material/NavigateNextRounded'
import { useTranslation }         from 'react-i18next'

import TaskPreviewDrawer       from '../tasks/TaskPreviewDrawer'
import { useFocusCoach }       from '../../hooks/useFocusCoach'
import CoachSettingsPanel      from './CoachSettingsPanel'
import DailyInsightBanner      from './DailyInsightBanner'
import MorningRoutineSection   from './MorningRoutineSection'
import OngoingHabitsSection    from './OngoingHabitsSection'
import type { TaskItem }       from '../../types'
import { Priority }            from '../../types'
import type { ScoredRecommendation, ReasonKey } from '../../hooks/focusEngine'

interface Props {
  tasks:            TaskItem[]
  onRefresh:        () => void
  onToggle?:        (taskId: string) => void
  onToggleSubTask?: (taskId: string, subId: string) => void
  onEdit?:          (task: TaskItem) => void
}

// ── Reason chip display map ────────────────────────────────────────────────────

const REASON_META: Record<ReasonKey, { emoji: string; color: string; i18n: string }> = {
  overdue:          { emoji: '🔴', color: '#ef4444', i18n: 'coach.reason.overdue' },
  dueToday:         { emoji: '📅', color: '#f97316', i18n: 'coach.reason.dueToday' },
  dueTomorrow:      { emoji: '📅', color: '#fb923c', i18n: 'coach.reason.dueTomorrow' },
  dueSoon:          { emoji: '📅', color: '#fbbf24', i18n: 'coach.reason.dueSoon' },
  criticalPriority: { emoji: '🔥', color: '#ef4444', i18n: 'coach.reason.criticalPriority' },
  highPriority:     { emoji: '⚡', color: '#f97316', i18n: 'coach.reason.highPriority' },
  frog:             { emoji: '🐸', color: '#22c55e', i18n: 'coach.reason.frog' },
  linkedToGoal:     { emoji: '🎯', color: '#7c5cff', i18n: 'coach.reason.linkedToGoal' },
  quickWin:         { emoji: '⚡', color: '#10b981', i18n: 'coach.reason.quickWin' },
  waitingDays:      { emoji: '⏳', color: '#94a3b8', i18n: 'coach.reason.waitingDays' },
  morningDeepWork:  { emoji: '🌅', color: '#3b82f6', i18n: 'coach.reason.morningDeepWork' },
  eveningLightTask: { emoji: '🌙', color: '#6366f1', i18n: 'coach.reason.eveningLightTask' },
  carriedOver:      { emoji: '🔄', color: '#f59e0b', i18n: 'coach.reason.carriedOver' },
  actionableSubtask:{ emoji: '📌', color: '#7c5cff', i18n: 'coach.reason.actionableSubtask' },
}

const PRIORITY_COLOR: Record<Priority, string> = {
  [Priority.Critical]: '#ef4444',
  [Priority.High]:     '#f97316',
  [Priority.Medium]:   '#7c5cff',
  [Priority.Low]:      '#94a3b8',
}

const ENERGY_LABELS: Record<string, string> = {
  morning:   '🌅',
  afternoon: '☀️',
  evening:   '🌙',
}

// ── Utilities ──────────────────────────────────────────────────────────────────

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatRemaining(minutes: number, targetTime: string): string {
  if (minutes <= 0) return ''
  if (minutes < 60) return `${minutes}m → ${targetTime}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m → ${targetTime}` : `${h}h → ${targetTime}`
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ReasonChips({ reasons, max = 3 }: { reasons: ReasonKey[]; max?: number }) {
  const { t } = useTranslation()
  const shown = reasons.slice(0, max)
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
      {shown.map(r => {
        const meta = REASON_META[r]
        return (
          <Chip
            key={r}
            label={`${meta.emoji} ${t(meta.i18n, r)}`}
            size="small"
            sx={{
              height: 18,
              fontSize: '0.62rem',
              bgcolor: `${meta.color}18`,
              color: meta.color,
              border: `1px solid ${meta.color}40`,
              fontWeight: 600,
            }}
          />
        )
      })}
    </Stack>
  )
}

// ── Main recommendation card (prominent) ──────────────────────────────────────

function MainRecCard({
  rec,
  onDone,
  onNext,
  onPreview,
  position,
}: {
  rec:       ScoredRecommendation
  onDone:    () => void
  onNext:    () => void
  onPreview: () => void
  position?: { current: number; total: number }
}) {
  const { t } = useTranslation()
  const { candidate: c, reasons, estimatedMinutes } = rec

  return (
    <Box
      sx={{
        p: 1.5,
        mb: 1.25,
        borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.8)',
        border: '1.5px solid rgba(124,92,255,0.2)',
        boxShadow: '0 2px 8px rgba(124,92,255,0.08)',
      }}
    >
      {/* Title row */}
      <Stack direction="row" alignItems="flex-start" gap={1}>
        <Box
          component="span"
          sx={{
            width: 8, height: 8, borderRadius: '50%', mt: 0.75, flexShrink: 0,
            bgcolor: PRIORITY_COLOR[c.priority],
          }}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.75}>
            <Typography variant="body2" fontWeight={700} noWrap sx={{ flex: 1 }}>
              {c.title}
            </Typography>
            <Chip
              label={formatDuration(estimatedMinutes)}
              size="small"
              sx={{ height: 18, fontSize: '0.62rem', flexShrink: 0 }}
            />
            <Tooltip title={t('task.preview')}>
              <IconButton size="small" sx={{ p: 0.25 }} onClick={onPreview}>
                <VisibilityRoundedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          </Stack>

          {c.isSubTask && c.parentTitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.15 }}>
              {t('coach.subtaskOf', { parent: c.parentTitle })}
            </Typography>
          )}

          <ReasonChips reasons={reasons} max={4} />
        </Box>
      </Stack>

      {/* Action row */}
      <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1.25 }}>
        <Button size="small" variant="contained" color="success" onClick={onDone} sx={{ flex: 1, py: 0.25 }}>
          {t('coach.markDone', 'בוצע ✓')}
        </Button>
        {position && position.total > 1 && (
          <Stack direction="row" alignItems="center" gap={0.25} sx={{ flexShrink: 0 }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
              {position.current}/{position.total}
            </Typography>
            <Tooltip title={t('coach.next', 'הבא')}>
              <IconButton size="small" sx={{ p: 0.25 }} onClick={onNext}>
                <NavigateNextRoundedIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Stack>
    </Box>
  )
}

// ── Compact recommendation row ─────────────────────────────────────────────────

function CompactRecRow({
  rec,
  onToggle,
  onPreview,
}: {
  rec:       ScoredRecommendation
  onToggle:  () => void
  onPreview: () => void
}) {
  const { t } = useTranslation()
  const { candidate: c, reasons, estimatedMinutes } = rec

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        py: 0.75,
        borderRadius: 1.5,
        borderBottom: '1px solid rgba(124,92,255,0.07)',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Box
        component="span"
        onClick={onToggle}
        sx={{ display: 'flex', cursor: 'pointer', flexShrink: 0 }}
      >
        <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 17, color: 'text.disabled' }} />
      </Box>

      <Box
        sx={{
          width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
          bgcolor: PRIORITY_COLOR[c.priority],
        }}
      />

      <Typography variant="caption" noWrap sx={{ flex: 1, fontWeight: 500 }}>
        {c.title}
        {c.isSubTask && c.parentTitle && (
          <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
            · {c.parentTitle}
          </Typography>
        )}
      </Typography>

      {reasons.slice(0, 2).map(r => {
        const meta = REASON_META[r]
        return (
          <Typography key={r} component="span" sx={{ fontSize: '0.7rem', flexShrink: 0 }}>
            {meta.emoji}
          </Typography>
        )
      })}

      <Chip
        label={formatDuration(estimatedMinutes)}
        size="small"
        sx={{ height: 16, fontSize: '0.58rem', flexShrink: 0 }}
      />

      <Tooltip title={t('task.preview')}>
        <IconButton size="small" sx={{ p: 0.25 }} onClick={onPreview}>
          <VisibilityRoundedIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function FocusCoachCard({ tasks, onRefresh, onToggle, onToggleSubTask, onEdit }: Props) {
  const { t } = useTranslation()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [previewTask,  setPreviewTask]  = useState<TaskItem | null>(null)
  const [mainIndex,    setMainIndex]    = useState(0)

  const { settings, setSettings, plan, refresh, completedToday, totalToday, progress, displayRoutines, displayHabits, today } = useFocusCoach(tasks)

  const handleRefresh = () => {
    setMainIndex(0)
    refresh()
    onRefresh()
  }

  function handleDone(rec: ScoredRecommendation) {
    const { candidate: c } = rec
    if (c.isSubTask && c.subTaskId) {
      onToggleSubTask?.(c.id, c.subTaskId)
    } else {
      onToggle?.(c.id)
    }
  }

  function handleNext() {
    const len = plan.focusTasks.length
    if (len > 1) setMainIndex(prev => (prev + 1) % len)
  }

  const recs    = plan.focusTasks
  const mainIdx = recs.length > 0 ? mainIndex % recs.length : 0
  const mainRec = recs[mainIdx]
  const restRecs = recs.filter((_, i) => i !== mainIdx)

  const remaining = totalToday - completedToday
  const timeLabel = formatRemaining(plan.availableMinutes, settings.targetTime)

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
      {totalToday > 0 && (
        <DailyInsightBanner
          progress={progress}
          completedCount={completedToday}
          remaining={remaining}
          dailyTarget={totalToday}
          tasks={tasks}
        />
      )}

      <Box sx={{ p: 2 }}>
        {/* ── Header ── */}
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1 }}>
          <BoltRoundedIcon color="primary" />

          <Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>
            {t('coach.title')}
          </Typography>

          {timeLabel && (
            <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>
              {timeLabel}
            </Typography>
          )}

          <Tooltip title={t('common.refresh')}>
            <IconButton size="small" onClick={handleRefresh}>
              <RefreshRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('common.settings')}>
            <IconButton size="small" onClick={() => setSettingsOpen(prev => !prev)}>
              <SettingsRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* ── Energy mode + progress ── */}
        <Stack direction="row" alignItems="center" gap={1} sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {ENERGY_LABELS[plan.energyMode]} {t(`coach.energy.${plan.energyMode}`, plan.energyMode)}
          </Typography>
          {totalToday > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
              {completedToday}/{totalToday}
            </Typography>
          )}
        </Stack>

        {totalToday > 0 && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 6, borderRadius: 999, mb: 1.5 }}
          />
        )}

        {/* ── Today's Schedule ── */}
        {plan.scheduledEvents.length > 0 && (
          <Box
            sx={{
              mb: 1.5, px: 1.25, py: 1,
              bgcolor: 'rgba(255,255,255,0.55)',
              borderRadius: 2,
              border: '1px solid rgba(124,92,255,0.1)',
            }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              📅 {t('coach.todaySchedule', 'לוח זמנים')}
            </Typography>
            <Stack spacing={0.4}>
              {plan.scheduledEvents.map(e => (
                <Stack key={e.task.id} direction="row" gap={0.75} alignItems="center">
                  <Box
                    component="span"
                    onClick={() => onToggle?.(e.task.id)}
                    sx={{ display: 'flex', cursor: 'pointer', flexShrink: 0 }}
                  >
                    {e.task.isCompleted
                      ? <CheckCircleRoundedIcon sx={{ fontSize: 15, color: 'success.main' }} />
                      : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                    }
                  </Box>
                  <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ minWidth: 38, flexShrink: 0 }}>
                    {e.time}
                  </Typography>
                  <Typography
                    variant="caption"
                    noWrap
                    sx={{
                      flex: 1,
                      textDecoration: e.task.isCompleted ? 'line-through' : 'none',
                      color: e.task.isCompleted ? 'text.disabled' : 'text.primary',
                    }}
                  >
                    {e.task.title}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        )}

        {/* ── Next event hint ── */}
        {plan.nextEvent && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.25 }}>
            🔔 {t('coach.nextEvent', { time: plan.nextEvent.time, title: plan.nextEvent.task.title })}
          </Typography>
        )}

        {/* ── Morning Routine ── */}
        <MorningRoutineSection
          routines={displayRoutines}
          today={today}
          onToggle={id => onToggle?.(id)}
        />

        {/* ── Today's Focus ── */}
        <Box sx={{ mb: recs.length > 0 ? 0.5 : 0 }}>
          <Stack direction="row" alignItems="center" gap={0.5} sx={{ mb: 0.75 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              🎯 {t('coach.focusSection.title')}
            </Typography>
          </Stack>

          {mainRec ? (
            <>
              <MainRecCard
                rec={mainRec}
                onDone={() => handleDone(mainRec)}
                onNext={handleNext}
                onPreview={() => setPreviewTask(mainRec.candidate.sourceTask)}
                position={{ current: mainIdx + 1, total: recs.length }}
              />
              {restRecs.length > 0 && (
                <Box
                  sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    bgcolor: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(124,92,255,0.1)',
                  }}
                >
                  {restRecs.map(rec => (
                    <CompactRecRow
                      key={rec.candidate.key}
                      rec={rec}
                      onToggle={() => handleDone(rec)}
                      onPreview={() => setPreviewTask(rec.candidate.sourceTask)}
                    />
                  ))}
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ py: 0.75, textAlign: 'center' }}>
              {completedToday > 0 ? (
                <Stack direction="row" alignItems="center" justifyContent="center" gap={0.75}>
                  <CheckCircleRoundedIcon sx={{ color: 'success.main', fontSize: 18 }} />
                  <Typography variant="caption" color="text.secondary">
                    {t('coach.empty.allDone')}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="caption" color="text.disabled">
                  {t('coach.focusSection.empty')}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        {/* ── Ongoing Habits ── */}
        <OngoingHabitsSection
          habits={displayHabits}
          today={today}
          onToggle={id => onToggle?.(id)}
          onToggleSubTask={(taskId, subId) => onToggleSubTask?.(taskId, subId)}
        />
      </Box>

      <CoachSettingsPanel open={settingsOpen} settings={settings} onChange={setSettings} />

      <TaskPreviewDrawer
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onEdit={(task) => { onEdit?.(task); setPreviewTask(null) }}
      />
    </Card>
  )
}
