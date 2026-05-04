import {
  Box, Card, CardActionArea, Chip, Divider,
  LinearProgress, List, ListItem, ListItemText, Typography,
} from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon                from '@mui/icons-material/ErrorRounded'
import TodayRoundedIcon                from '@mui/icons-material/TodayRounded'
import TimerRoundedIcon                from '@mui/icons-material/TimerRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { mockTasks, mockGoals } from '../data'
import { ExecutionType, GoalType, Priority } from '../types'
import type { TaskItem } from '../types'
import GoalCategoryIcon from '../components/goals/GoalCategoryIcon'

// ─── helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

const PRIORITY_ORDER: Record<Priority, number> = {
  [Priority.Critical]: 0,
  [Priority.High]:     1,
  [Priority.Medium]:   2,
  [Priority.Low]:      3,
}

const PRIORITY_STYLE: Record<Priority, { bg: string; color: string }> = {
  [Priority.Low]:      { bg: '#E8F5E9', color: '#2E7D32' },
  [Priority.Medium]:   { bg: '#FFF8E1', color: '#F57F17' },
  [Priority.High]:     { bg: '#FFEBEE', color: '#C62828' },
  [Priority.Critical]: { bg: '#F3E5F5', color: '#6A1B9A' },
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // ── Derived data ────────────────────────────────────────────────────────────
  const todayTasks     = mockTasks.filter((tk) => tk.dueDate?.startsWith(TODAY))
  const completedToday = todayTasks.filter((tk) =>  tk.isCompleted).length
  const remainingToday = todayTasks.filter((tk) => !tk.isCompleted).length
  const urgentToday    = todayTasks.filter(
    (tk) => !tk.isCompleted && (tk.priority === Priority.Critical || tk.priority === Priority.High),
  ).length

  // Frog = highest-priority incomplete task today
  const frog: TaskItem | null =
    todayTasks
      .filter((tk) => !tk.isCompleted)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])[0] ?? null

  // Two-minute = Quick execution type, not completed, today
  const twoMinTasks = todayTasks.filter(
    (tk) => !tk.isCompleted && tk.executionType === ExecutionType.Quick,
  )

  const stats = [
    { label: t('dashboard.totalToday'),     value: todayTasks.length, color: '#5438CC', bg: '#EDE9FF', Icon: TodayRoundedIcon         },
    { label: t('dashboard.completedToday'), value: completedToday,    color: '#2E7D32', bg: '#E8F5E9', Icon: CheckCircleRoundedIcon    },
    { label: t('dashboard.remainingToday'), value: remainingToday,    color: '#E65100', bg: '#FFF3E0', Icon: TimerRoundedIcon          },
    { label: t('dashboard.urgent'),         value: urgentToday,       color: '#C62828', bg: '#FFEBEE', Icon: ErrorRoundedIcon          },
  ]

  return (
    <Box sx={{ px: 2, pt: 2, pb: 4 }}>

      {/* ── Stats strip ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 3 }}>
        {stats.map((s) => (
          <Box
            key={s.label}
            sx={{
              borderRadius: 2.5,
              py: 1.5,
              px: 0.5,
              textAlign: 'center',
              bgcolor: s.bg,
              border: '1.5px solid',
              borderColor: `${s.color}22`,
            }}
          >
            <s.Icon sx={{ fontSize: 22, color: s.color, display: 'block', mx: 'auto', mb: 0.25 }} />
            <Typography variant="h6" fontWeight={700} lineHeight={1} sx={{ color: s.color }}>
              {s.value}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem', display: 'block', mt: 0.25 }}>
              {s.label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Frog task ── */}
      <SectionHeader title={t('dashboard.frog')} subtitle={t('dashboard.frogSubtitle')} emoji="🐸" />
      {frog ? (
        <Card sx={{ borderRadius: 3, mb: 3, border: '1.5px solid rgba(124,92,255,0.18)', boxShadow: '0 2px 12px rgba(124,92,255,0.09)' }}>
          <CardActionArea sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Typography sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>🐸</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>{frog.title}</Typography>
                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <PriorityChip priority={frog.priority} />
                  {frog.durationMinutes && (
                    <Typography variant="caption" color="text.secondary">{frog.durationMinutes}&apos;</Typography>
                  )}
                </Box>
              </Box>
            </Box>
          </CardActionArea>
        </Card>
      ) : (
        <EmptyState text={t('dashboard.noFrog')} mb={3} />
      )}

      {/* ── Two-minute tasks ── */}
      <SectionHeader title={t('dashboard.twoMin')} subtitle={t('dashboard.twoMinSubtitle')} emoji="⚡" />
      {twoMinTasks.length > 0 ? (
        <Card sx={{ borderRadius: 3, mb: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 6px rgba(124,92,255,0.05)' }}>
          <List disablePadding>
            {twoMinTasks.map((tk, i) => (
              <Box key={tk.id}>
                {i > 0 && <Divider sx={{ ml: 5 }} />}
                <ListItem sx={{ px: 2, py: 0.75 }}>
                  <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1.5, flexShrink: 0 }} />
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={500}>{tk.title}</Typography>}
                  />
                  {tk.durationMinutes && (
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
                      {tk.durationMinutes}&apos;
                    </Typography>
                  )}
                </ListItem>
              </Box>
            ))}
          </List>
        </Card>
      ) : (
        <EmptyState text={t('dashboard.noTwoMin')} mb={3} />
      )}

      {/* ── Progress by goal ── */}
      <SectionHeader title={t('dashboard.goalProgress')} emoji="🎯" />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        {mockGoals.map((goal) => {
          const isFiniteGoal = goal.goalType === GoalType.Finite
          const pct = isFiniteGoal
            ? (goal.totalTasks > 0 ? Math.round((goal.completedTasks / goal.totalTasks) * 100) : 0)
            : ((goal.weeklyTotal ?? 0) > 0
                ? Math.round(((goal.weeklyCompleted ?? 0) / (goal.weeklyTotal ?? 1)) * 100)
                : 0)
          const subLabel = isFiniteGoal
            ? `${t('dashboard.overallProgress')} · ${goal.completedTasks}/${goal.totalTasks}`
            : `${t('dashboard.weeklyProgress')} · ${goal.weeklyCompleted ?? 0}/${goal.weeklyTotal ?? 0}`

          return (
            <Card key={goal.id} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 6px rgba(124,92,255,0.05)' }}>
              <CardActionArea onClick={() => navigate(`/goals/${goal.id}`)} sx={{ px: 2, pt: 1.5, pb: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <GoalCategoryIcon category={goal.category} size={36} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ flex: 1 }}>
                        {goal.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ color: pct === 100 ? '#4CAF50' : 'primary.main', ml: 1, flexShrink: 0 }}
                      >
                        {pct}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{
                        borderRadius: 4,
                        height: 5,
                        bgcolor: 'rgba(124,92,255,0.10)',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: pct === 100 ? '#4CAF50' : '#7C5CFF',
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {subLabel}
                    </Typography>
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          )
        })}
      </Box>

      {/* ── Today's task list ── */}
      <SectionHeader title={t('dashboard.todayList')} emoji="📋" />
      {todayTasks.length === 0 ? (
        <EmptyState text={t('dashboard.noTodayTasks')} />
      ) : (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 6px rgba(124,92,255,0.05)' }}>
          <List disablePadding>
            {todayTasks.map((tk, i) => (
              <Box key={tk.id}>
                {i > 0 && <Divider sx={{ ml: 5 }} />}
                <ListItem sx={{ px: 2, py: 0.875, alignItems: 'flex-start' }}>
                  {tk.isCompleted
                    ? <CheckCircleRoundedIcon sx={{ fontSize: 18, color: 'primary.main', mr: 1.5, mt: 0.2, flexShrink: 0 }} />
                    : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1.5, mt: 0.2, flexShrink: 0 }} />
                  }
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight={tk.isCompleted ? 400 : 500}
                        sx={{
                          textDecoration: tk.isCompleted ? 'line-through' : 'none',
                          color:          tk.isCompleted ? 'text.disabled' : 'text.primary',
                          lineHeight: 1.4,
                        }}
                      >
                        {tk.title}
                      </Typography>
                    }
                    secondary={
                      tk.plannedTime
                        ? <Typography component="span" variant="caption" color="text.secondary">{tk.plannedTime}</Typography>
                        : undefined
                    }
                  />
                  <PriorityChip priority={tk.priority} />
                </ListItem>
              </Box>
            ))}
          </List>
        </Card>
      )}
    </Box>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, emoji,
}: {
  title: string; subtitle?: string; emoji?: string
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, mb: 1 }}>
      {emoji && (
        <Typography sx={{ fontSize: 16, lineHeight: 1 }}>{emoji}</Typography>
      )}
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ letterSpacing: 0.4, textTransform: 'uppercase' }}
      >
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem' }}>
          — {subtitle}
        </Typography>
      )}
    </Box>
  )
}

function EmptyState({ text, mb }: { text: string; mb?: number }) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        border: '1px dashed',
        borderColor: 'divider',
        py: 2,
        textAlign: 'center',
        mb: mb ?? 0,
      }}
    >
      <Typography variant="caption" color="text.disabled">{text}</Typography>
    </Box>
  )
}

function PriorityChip({ priority }: { priority: Priority }) {
  const { t } = useTranslation()
  const style = PRIORITY_STYLE[priority]
  return (
    <Chip
      label={t(`priority.${priority}`)}
      size="small"
      sx={{
        height: 18,
        fontSize: '0.62rem',
        fontWeight: 700,
        bgcolor: style.bg,
        color:   style.color,
        '& .MuiChip-label': { px: 0.75 },
        flexShrink: 0,
        ml: 0.5,
        alignSelf: 'flex-start',
        mt: 0.2,
      }}
    />
  )
}
