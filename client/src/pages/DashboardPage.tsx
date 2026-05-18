import { useEffect, useState } from 'react'
import {
  Box, Button, Card, CardActionArea, Chip, Divider, IconButton,
  LinearProgress, List, ListItem, ListItemText, Tooltip, Typography,
} from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import ErrorRoundedIcon                from '@mui/icons-material/ErrorRounded'
import TodayRoundedIcon                from '@mui/icons-material/TodayRounded'
import TimerRoundedIcon                from '@mui/icons-material/TimerRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import AddRoundedIcon                  from '@mui/icons-material/AddRounded'
import ArrowForwardIosRoundedIcon      from '@mui/icons-material/ArrowForwardIosRounded'
import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { tasksApi, goalsApi } from '../api'
import { useAuth }        from '../contexts/AuthContext'
import { ExecutionType, GoalType, Priority } from '../types'
import type { TaskItem, Goal } from '../types'
import GoalCategoryIcon  from '../components/goals/GoalCategoryIcon'
import TaskWheelModal    from '../components/tasks/TaskWheelModal'
import AddTaskDialog     from '../components/tasks/AddTaskDialog'
import AddGoalDialog     from '../components/goals/AddGoalDialog'
import AiParseDialog     from '../components/AiParseDialog'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import { TODAY, PRIORITY_STYLE } from '../utils'

// ─── helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<Priority, number> = {
  [Priority.Critical]: 0,
  [Priority.High]:     1,
  [Priority.Medium]:   2,
  [Priority.Low]:      3,
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [wheelOpen, setWheelOpen] = useState(false)

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addGoalOpen, setAddGoalOpen] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    tasksApi.getByUser(user.id).then(setTasks).catch(() => {})
    goalsApi.getByUser(user.id).then(setGoals).catch(() => {})
  }, [user])

  // ── Derived data ────────────────────────────────────────────────────────────
  const todayTasks     = tasks.filter((tk) => tk.dueDate?.startsWith(TODAY))
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

  // Two-minute = Quick execution type OR duration <= 2 min, not completed
  const twoMinTasks = tasks.filter(
    (tk) => !tk.isCompleted && (
      tk.executionType === ExecutionType.Quick ||
      (tk.durationMinutes != null && tk.durationMinutes <= 2)
    ),
  )

  const stats = [
    { label: t('dashboard.totalToday'),     value: todayTasks.length, color: '#5438CC', bg: '#EDE9FF', Icon: TodayRoundedIcon,      filter: 'today'     },
    { label: t('dashboard.completedToday'), value: completedToday,    color: '#2E7D32', bg: '#E8F5E9', Icon: CheckCircleRoundedIcon, filter: 'completed' },
    { label: t('dashboard.remainingToday'), value: remainingToday,    color: '#E65100', bg: '#FFF3E0', Icon: TimerRoundedIcon,       filter: 'today'     },
    { label: t('dashboard.urgent'),         value: urgentToday,       color: '#C62828', bg: '#FFEBEE', Icon: ErrorRoundedIcon,       filter: 'urgent'    },
  ]

  return (
    <Box sx={{ px: 2, pt: 2, pb: 4 }}>

      {/* ── Stats strip ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, mb: 3 }}>
        {stats.map((s) => (
          <Box
            key={s.label}
            onClick={() => navigate(`/tasks?filter=${s.filter}`)}
            sx={{
              borderRadius: 2.5,
              py: 1.5,
              px: 0.5,
              textAlign: 'center',
              bgcolor: s.bg,
              border: '1.5px solid',
              borderColor: `${s.color}22`,
              cursor: 'pointer',
              transition: 'transform 0.12s, box-shadow 0.12s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${s.color}33` },
              '&:active': { transform: 'translateY(0)' },
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

      {/* ── Task Wheel ── */}
      <Card
        sx={{
          borderRadius: 3, mb: 3,
          background: 'linear-gradient(135deg, #EDE9FF 0%, #F5F0FF 100%)',
          border: '1.5px solid rgba(124,92,255,0.2)',
          boxShadow: '0 2px 16px rgba(124,92,255,0.1)',
        }}
      >
        <Box sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>🎡</Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700}>{t('wheel.cardTitle')}</Typography>
            <Typography variant="caption" color="text.secondary">{t('wheel.cardSubtitle')}</Typography>
          </Box>
          <Button
            variant="contained"
            size="small"
            onClick={() => setWheelOpen(true)}
            sx={{ borderRadius: 2.5, fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 }}
          >
            {t('wheel.spin')}
          </Button>
        </Box>
      </Card>

      {/* ── Frog task ── */}
      <SectionHeader title={t('dashboard.frog')} subtitle={t('dashboard.frogSubtitle')} emoji="🐸" />
      {frog ? (
        <Card sx={{ borderRadius: 3, mb: 3, border: '1.5px solid rgba(124,92,255,0.18)', boxShadow: '0 2px 12px rgba(124,92,255,0.09)' }}>
          <CardActionArea onClick={() => navigate('/tasks')} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Typography sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>🐸</Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>{frog.title}</Typography>
                <Box sx={{ display: 'flex', gap: 0.75, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  <PriorityChip priority={frog.priority} />
                  {frog.durationMinutes && (
                    <Typography variant="caption" color="text.secondary">{frog.durationMinutes}{t('task.minutesShort')}</Typography>
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
                <ListItem
                  onClick={() => navigate('/tasks')}
                  sx={{ px: 2, py: 0.75, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                >
                  <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', mr: 1.5, flexShrink: 0 }} />
                  <ListItemText
                    primary={<Typography variant="body2" fontWeight={500}>{tk.title}</Typography>}
                  />
                  {tk.durationMinutes && (
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 1 }}>
                      {tk.durationMinutes}{t('task.minutesShort')}
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
      <SectionHeader
        title={t('dashboard.goalProgress')}
        emoji="🎯"
        onAdd={() => setAddGoalOpen(true)}
        onSeeAll={() => navigate('/goals')}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        {goals.map((goal) => {
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
      <SectionHeader
        title={t('dashboard.todayList')}
        emoji="📋"
        onAdd={() => setAddTaskOpen(true)}
        onSeeAll={() => navigate('/tasks')}
      />
      {todayTasks.length === 0 ? (
        <EmptyState text={t('dashboard.noTodayTasks')} />
      ) : (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 6px rgba(124,92,255,0.05)' }}>
          <List disablePadding>
            {todayTasks.map((tk, i) => (
              <Box key={tk.id}>
                {i > 0 && <Divider sx={{ ml: 5 }} />}
                <ListItem sx={{ px: 2, py: 0.875, alignItems: 'flex-start', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => navigate('/tasks')}
                >
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

      <TaskWheelModal open={wheelOpen} onClose={() => setWheelOpen(false)} tasks={tasks} />

      <Tooltip title={t('ai.buttonTooltip')}>
        <IconButton
          onClick={() => setAiOpen(true)}
          sx={{
            position: 'fixed', bottom: 88, right: 16,
            bgcolor: 'secondary.main', color: 'white',
            '&:hover': { bgcolor: 'secondary.dark' },
            boxShadow: 3,
          }}
        >
          <AutoAwesomeRoundedIcon />
        </IconButton>
      </Tooltip>

      <AddTaskDialog
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onAdd={(task) => { setTasks((prev) => [task, ...prev]); setAddTaskOpen(false) }}
        goals={goals}
        userId={user?.id ?? ''}
      />

      <AddGoalDialog
        open={addGoalOpen}
        onClose={() => setAddGoalOpen(false)}
        onAdd={(goal) => { setGoals((prev) => [goal, ...prev]); setAddGoalOpen(false) }}
        userId={user?.id ?? ''}
        createGoal={goalsApi.create}
      />

      <AiParseDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        userId={user?.id ?? ''}
        onCreated={(newTasks, newGoals) => {
          setTasks(prev => [...newTasks, ...prev])
          setGoals(prev => [...newGoals, ...prev])
        }}
      />
    </Box>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────────

function SectionHeader({
  title, subtitle, emoji, onAdd, onSeeAll,
}: {
  title: string; subtitle?: string; emoji?: string
  onAdd?: () => void
  onSeeAll?: () => void
}) {
  const { t } = useTranslation()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
      {emoji && (
        <Typography sx={{ fontSize: 16, lineHeight: 1 }}>{emoji}</Typography>
      )}
      <Typography
        variant="caption"
        fontWeight={700}
        color="text.secondary"
        sx={{ letterSpacing: 0.4, textTransform: 'uppercase', flex: 1 }}
      >
        {title}
        {subtitle && (
          <Typography component="span" variant="caption" color="text.disabled" sx={{ fontSize: '0.68rem', ml: 0.5 }}>
            — {subtitle}
          </Typography>
        )}
      </Typography>
      {onSeeAll && (
        <Tooltip title={t('common.viewAll', 'View all')}>
          <IconButton size="small" onClick={onSeeAll} sx={{ color: 'primary.main', p: 0.25 }}>
            <ArrowForwardIosRoundedIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      )}
      {onAdd && (
        <Tooltip title={t('common.add')}>
          <IconButton size="small" onClick={onAdd} sx={{ color: 'primary.main', p: 0.25 }}>
            <AddRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
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
