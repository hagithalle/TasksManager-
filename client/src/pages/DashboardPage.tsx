import { useEffect, useState } from 'react'
import {
  Box, Button, Card, CardActionArea, Chip, Collapse, Divider, IconButton,
  LinearProgress, List, ListItem, ListItemText, Tooltip, Typography,
} from '@mui/material'
import CheckCircleRoundedIcon          from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import AddRoundedIcon                  from '@mui/icons-material/AddRounded'
import ArrowForwardIosRoundedIcon      from '@mui/icons-material/ArrowForwardIosRounded'
import ExpandMoreRoundedIcon           from '@mui/icons-material/ExpandMoreRounded'
import ExpandLessRoundedIcon           from '@mui/icons-material/ExpandLessRounded'

import { useTranslation } from 'react-i18next'
import { useNavigate }    from 'react-router-dom'
import { tasksApi, goalsApi } from '../api'
import { useAuth }        from '../contexts/AuthContext'
import { ExecutionType, Priority, TaskStatus } from '../types'
import type { TaskItem, Goal } from '../types'
import GoalCategoryIcon  from '../components/goals/GoalCategoryIcon'
import TaskWheelModal    from '../components/tasks/TaskWheelModal'
import AddTaskDialog     from '../components/tasks/AddTaskDialog'
import AddGoalDialog     from '../components/goals/AddGoalDialog'
import AiParseDialog     from '../components/AiParseDialog'
import AiTaskAnalysisDialog from '../components/AiTaskAnalysisDialog'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded'
import { TODAY, PRIORITY_STYLE, isArchivedCompleted } from '../utils'
import TaskPreviewDrawer from '../components/tasks/TaskPreviewDrawer'
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded'
import FocusCoachCard    from '../components/coach/FocusCoachCard'
import StreakCard        from '../components/streak/StreakCard'
import DailyInsightCard from '../components/streak/DailyInsightCard'
import { useStreak }    from '../hooks/useStreak'

import DailyHabitsList from '../components/habits/DailyHabitsList'
import AiAssistantPanel from '../components/AiAssistantPanel'

// ─── helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<Priority, number> = {
  [Priority.Critical]: 0,
  [Priority.High]:     1,
  [Priority.Medium]:   2,
  [Priority.Low]:      3,
}

// ─── TodayTaskList ────────────────────────────────────────────────────────────

const INITIAL_SHOW = 5

function TodayTaskList({
  tasks,
  onToggle,
  onNavigate,
}: {
  tasks: TaskItem[]
  onToggle: (id: string) => void
  onNavigate: () => void
}) {
  const { t }         = useTranslation()
  const [showAll, setShowAll] = useState(false)
  const [previewTask, setPreviewTask] = useState<TaskItem | null>(null)

  // Filter: show only tasks that are not completed for today
  const filteredTasks = tasks.filter(tk => !tk.isCompleted)

  if (filteredTasks.length === 0) return <EmptyState text={t('dashboard.noTodayTasks')} mb={3} />

  // Group: tasks with plannedTime vs without
  const withTime    = filteredTasks.filter(tk => tk.plannedTime).sort((a, b) => (a.plannedTime ?? '').localeCompare(b.plannedTime ?? ''))
  const withoutTime = filteredTasks.filter(tk => !tk.plannedTime)
  const ordered     = [...withTime, ...withoutTime]

  const visible  = showAll ? ordered : ordered.slice(0, INITIAL_SHOW)
  const hiddenCount = ordered.length - INITIAL_SHOW

  // Split by planned time groups: "before noon", "after noon" (or just "no time")
  let lastTimeGroup: string | null = null

  return (
    <>
      <Card sx={{ borderRadius: 3, mb: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 6px rgba(124,92,255,0.05)' }}>
        <List disablePadding>
          {visible.map((tk, i) => {
            // Time group label
            let groupHeader: string | null = null
            const tg = tk.plannedTime ? tk.plannedTime.slice(0, 5) : t('dashboard.noTime')
            if (tg !== lastTimeGroup) { groupHeader = tg; lastTimeGroup = tg }

            return (
              <Box key={tk.id}>
                {groupHeader && (
                  <Box sx={{ px: 2, pt: i === 0 ? 1 : 0.75, pb: 0.25, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="primary.main" fontWeight={700} sx={{ fontSize: '0.65rem' }}>
                      {tk.plannedTime ? `⏰ ${groupHeader}` : `📌 ${groupHeader}`}
                    </Typography>
                    <Divider sx={{ flex: 1 }} />
                  </Box>
                )}
                {!groupHeader && i > 0 && <Divider sx={{ ml: 5 }} />}
                <ListItem
                  sx={{ px: 2, py: 0.75, alignItems: 'center', cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={onNavigate}
                >
                  <Box
                    component="span"
                    onClick={(e) => { e.stopPropagation(); onToggle(tk.id) }}
                    sx={{ display: 'flex', alignItems: 'center', mr: 1.5, flexShrink: 0, cursor: 'pointer', borderRadius: '50%', '&:hover': { bgcolor: 'action.selected' }, p: 0.25 }}
                  >
                    {tk.isCompleted
                      ? <CheckCircleRoundedIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                      : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 22, color: 'text.disabled' }} />
                    }
                  </Box>
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
                  />
                  {tk.durationMinutes && (
                    <Chip
                      label={`${tk.durationMinutes}${t('task.minutesShort')}`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.6rem', ml: 0.5, flexShrink: 0 }}
                    />
                  )}
                  <PriorityChip priority={tk.priority} />
                  <Tooltip title={t('task.preview')}>
                    <IconButton size="small" onClick={e => { e.stopPropagation(); setPreviewTask(tk) }}>
                      <VisibilityRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              </Box>
            )
          })}
        </List>

        {hiddenCount > 0 && (
          <Box
            onClick={() => setShowAll(o => !o)}
            sx={{ px: 2, py: 0.875, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, cursor: 'pointer', borderTop: '1px solid', borderColor: 'divider', '&:hover': { bgcolor: 'action.hover' } }}
          >
            {showAll
              ? <><ExpandLessRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} /><Typography variant="caption" color="primary.main" fontWeight={600}>{t('dashboard.showLess')}</Typography></>
              : <><ExpandMoreRoundedIcon sx={{ fontSize: 16, color: 'primary.main' }} /><Typography variant="caption" color="primary.main" fontWeight={600}>{t('dashboard.showMore', { count: hiddenCount })}</Typography></>
            }
          </Box>
        )}
      </Card>
      <TaskPreviewDrawer task={previewTask} onClose={() => setPreviewTask(null)} onEdit={() => {}} />
    </>
  )
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
  const [planOpen, setPlanOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    tasksApi.getByUser(user.id).then(setTasks).catch(() => {})
    goalsApi.getByUser(user.id).then(setGoals).catch(() => {})
  }, [user])

  const toggleTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const updated = { ...task, isCompleted: !task.isCompleted }
    setTasks((prev) => prev.map((t) => t.id === taskId ? updated : t))
    tasksApi.update(taskId, { isCompleted: updated.isCompleted }).catch(() => {
      setTasks((prev) => prev.map((t) => t.id === taskId ? task : t))
    })
  }

  const toggleSubTask = (taskId: string, subId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const currentSub = (task.subTasks ?? []).find((s) => s.id === subId)
    if (!currentSub) return
    const newSubs = (task.subTasks ?? []).map((s) =>
      s.id === subId ? { ...s, isCompleted: !s.isCompleted } : s,
    )
    const allDone = newSubs.length > 0 && newSubs.every((s) => s.isCompleted)
    const updated = { ...task, subTasks: newSubs, isCompleted: allDone ? true : task.isCompleted }
    setTasks((prev) => prev.map((t) => t.id === taskId ? updated : t))
    tasksApi.updateSubTask(subId, { isCompleted: !currentSub.isCompleted }).catch(() => {
      setTasks((prev) => prev.map((t) => t.id === taskId ? task : t))
    })
  }

  const moveCarriedTask = (taskId: string, when: 'today' | 'tomorrow') => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const dueDate = when === 'today'
      ? TODAY
      : new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
    const updated = { ...task, dueDate, taskStatus: TaskStatus.Open }
    setTasks((prev) => prev.map((t) => t.id === taskId ? updated : t))
    tasksApi.update(taskId, { dueDate, status: TaskStatus.Open }).catch(() => {
      setTasks((prev) => prev.map((t) => t.id === taskId ? task : t))
    })
  }

  const archiveCarriedTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
    tasksApi.update(taskId, { status: TaskStatus.Archived }).catch(() => {
      setTasks((prev) => [task, ...prev])
    })
  }

  const { streak, last7 } = useStreak(tasks)

  // ── Derived data ────────────────────────────────────────────────────────────
  // Exclude tasks completed more than 24 h ago from all display logic
  const visibleTasks   = tasks.filter((tk) => !isArchivedCompleted(tk))
  const carriedTasks   = visibleTasks.filter((tk) => tk.taskStatus === TaskStatus.CarriedOver && !tk.isCompleted)
  const todayTasks     = visibleTasks.filter((tk) => tk.dueDate?.startsWith(TODAY) && !tk.isCompleted)
  const completedToday = todayTasks.filter((tk) =>  tk.isCompleted).length
  const remainingToday = todayTasks.filter((tk) => !tk.isCompleted).length

  // Frog = highest-priority incomplete task today
  const frog: TaskItem | null =
    todayTasks
      .filter((tk) => !tk.isCompleted)
      .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])[0] ?? null

  // Two-minute = Quick execution type OR duration <= 2 min, not completed
  const twoMinTasks = visibleTasks.filter(
    (tk) => !tk.isCompleted && (
      tk.executionType === ExecutionType.Quick ||
      (tk.durationMinutes != null && tk.durationMinutes <= 2)
    ),
  )

  const frogCount  = todayTasks.filter((tk) => !tk.isCompleted).length > 0 ? 1 : 0

  const stats = [
    {
      emoji: '✅', value: completedToday,    color: '#2E7D32', bg: '#E8F5E9',
      label: t('dashboard.completedToday'),  sub: t('dashboard.completedSub'),
      filter: 'completed',
    },
    {
      emoji: '⏰', value: remainingToday,    color: '#5438CC', bg: '#EDE9FF',
      label: t('dashboard.remainingToday'),  sub: t('dashboard.remainingSub'),
      filter: 'today',
    },
    {
      emoji: '🐸', value: frogCount,         color: '#388E3C', bg: '#F1F8E9',
      label: t('dashboard.frog'),            sub: t('dashboard.frogSub'),
      filter: 'urgent',
    },
    {
      emoji: '⚡', value: twoMinTasks.length, color: '#0277BD', bg: '#E1F5FE',
      label: t('dashboard.twoMin'),          sub: t('dashboard.twoMinSub'),
      filter: 'today',
    },
    {
      emoji: '🔥', value: streak,             color: '#E65100', bg: '#FFF3E0',
      label: t('streak.title'),              sub: t('streak.days'),
      filter: null,
    },
  ]

  return (
    <Box sx={{ px: 2, pt: 2, pb: 4 }}>

      {/* ── Stats strip ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0.75, mb: 3 }}>
        {stats.map((s) => (
          <Box
            key={s.label}
            onClick={() => s.filter && navigate(`/tasks?filter=${s.filter}`)}
            sx={{
              borderRadius: 2.5,
              py: 1.25,
              px: 0.25,
              textAlign: 'center',
              bgcolor: s.bg,
              border: '1.5px solid',
              borderColor: `${s.color}22`,
              cursor: s.filter ? 'pointer' : 'default',
              transition: 'transform 0.12s, box-shadow 0.12s',
              '&:hover': s.filter ? { transform: 'translateY(-2px)', boxShadow: `0 4px 12px ${s.color}33` } : {},
              '&:active': s.filter ? { transform: 'translateY(0)' } : {},
            }}
          >
            <Typography sx={{ fontSize: 18, lineHeight: 1, display: 'block', mb: 0.25 }}>{s.emoji}</Typography>
            <Typography variant="h6" fontWeight={800} lineHeight={1} sx={{ color: s.color, fontSize: '1.1rem' }}>
              {s.value}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem', display: 'block', mt: 0.25, lineHeight: 1.2 }}>
              {s.label}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: '0.5rem', display: 'block', color: s.color, fontWeight: 600, lineHeight: 1.2 }}>
              {s.sub}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Carried-over tasks ── */}
      {carriedTasks.length > 0 && (
        <CarryOverSection
          tasks={carriedTasks}
          onMoveToday={(id) => moveCarriedTask(id, 'today')}
          onMoveTomorrow={(id) => moveCarriedTask(id, 'tomorrow')}
          onArchive={archiveCarriedTask}
        />
      )}

      {/* ── Focus Coach ── */}
      <FocusCoachCard
        tasks={tasks}
        onRefresh={() => {
          if (!user) return
          tasksApi.getByUser(user.id).then(setTasks).catch(() => {})
        }}
        onToggle={toggleTask}
        onToggleSubTask={toggleSubTask}
      />

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
                <ListItem sx={{ px: 2, py: 0.75, alignItems: 'center' }}>
                  <Box
                    component="span"
                    onClick={() => toggleTask(tk.id)}
                    sx={{ display: 'flex', alignItems: 'center', mr: 1.5, flexShrink: 0, cursor: 'pointer', borderRadius: '50%', '&:hover': { bgcolor: 'action.selected' }, p: 0.25 }}
                  >
                    {tk.isCompleted
                      ? <CheckCircleRoundedIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                      : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 22, color: 'text.disabled' }} />
                    }
                  </Box>
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
                  />
                  {tk.durationMinutes && (
                    <Chip
                      label={`${tk.durationMinutes}${t('task.minutesShort')}`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.6rem', ml: 0.5, flexShrink: 0 }}
                    />
                  )}
                  <PriorityChip priority={tk.priority} />
                  <Tooltip title={t('task.preview')}>
                    <IconButton size="small" onClick={e => { e.stopPropagation(); setPreviewTask(tk) }}>
                      <VisibilityRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </ListItem>
              </Box>
            ))}
          </List>
          <TaskPreviewDrawer task={previewTask} onClose={() => setPreviewTask(null)} onEdit={() => {}} />
        </Card>
      ) : (
        <EmptyState text={t('dashboard.noTwoMin')} mb={3} />
      )}

      {/* ── Today's task list ── */}
      <SectionHeader
        title={t('dashboard.todayList')}
        emoji="📋"
        onAdd={() => setAddTaskOpen(true)}
        onSeeAll={() => navigate('/tasks')}
      />
      <TodayTaskList tasks={todayTasks} onToggle={toggleTask} onNavigate={() => navigate('/tasks')} />

      {/* ── Progress by goal ── */}
      <SectionHeader
        title={t('dashboard.goalProgress')}
        emoji="🎯"
        onAdd={() => setAddGoalOpen(true)}
        onSeeAll={() => navigate('/goals')}
      />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
        {goals.map((goal) => {
          // Derive progress live from tasks state
          const goalTasks = tasks.filter((tk) => tk.goalId === goal.id)
          const completedCount = goalTasks.filter((tk) => tk.isCompleted).length
          const totalCount = goalTasks.length
          const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
          const subLabel = `${completedCount}/${totalCount} ${t('dashboard.tasksCompleted')}`

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

      {/* ── Streak + Daily Insight ── */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <StreakCard streak={streak} last7={last7} />
        <DailyInsightCard />
      </Box>

      <TaskWheelModal open={wheelOpen} onClose={() => setWheelOpen(false)} tasks={visibleTasks} />

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

      <Tooltip title={t('ai.plan.buttonTooltip')}>
        <IconButton
          onClick={() => setPlanOpen(true)}
          sx={{
            position: 'fixed', bottom: 144, right: 16,
            bgcolor: 'primary.main', color: 'white',
            '&:hover': { bgcolor: 'primary.dark' },
            boxShadow: 3,
          }}
        >
          <PsychologyRoundedIcon />
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

      <AiTaskAnalysisDialog
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        userId={user?.id ?? ''}
        onCreated={() => {
          // Reload tasks and goals after AI plan creation
          if (user?.id) {
            tasksApi.getByUser(user.id).then(setTasks).catch(() => {})
            goalsApi.getByUser(user.id).then(setGoals).catch(() => {})
          }
        }}
      />

      {/* ── AI Assistant floating panel ── */}
      <AiAssistantPanel
        tasks={tasks}
        onTaskMoved={(id) => {
          // Refresh task list after moving a task to tomorrow
          setTasks(prev => prev.map(tk =>
            tk.id === id ? { ...tk, dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10) } : tk
          ))
        }}
      />
    </Box>
  )
}

// ─── sub-components ───────────────────────────────────────────────────────────────

// ─── CarryOverSection ─────────────────────────────────────────────────────────

function CarryOverSection({
  tasks,
  onMoveToday,
  onMoveTomorrow,
  onArchive,
}: {
  tasks: TaskItem[]
  onMoveToday:    (id: string) => void
  onMoveTomorrow: (id: string) => void
  onArchive:      (id: string) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* Header — clickable to collapse */}
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.75, mb: open ? 1 : 0,
          cursor: 'pointer',
          '&:hover': { opacity: 0.8 },
        }}
      >
        <Typography sx={{ fontSize: 16, lineHeight: 1 }}>🔄</Typography>
        <Typography
          variant="caption"
          fontWeight={700}
          color="warning.dark"
          sx={{ letterSpacing: 0.4, textTransform: 'uppercase', flex: 1 }}
        >
          {t('carryOver.sectionTitle')}
          <Typography
            component="span"
            variant="caption"
            sx={{ ml: 0.75, bgcolor: '#fed7aa', color: '#c2410c', borderRadius: 1, px: 0.75, py: 0.1, fontWeight: 700 }}
          >
            {tasks.length}
          </Typography>
        </Typography>
        {open ? <ExpandLessRoundedIcon sx={{ fontSize: 16, color: 'warning.dark' }} /> : <ExpandMoreRoundedIcon sx={{ fontSize: 16, color: 'warning.dark' }} />}
      </Box>

      <Collapse in={open}>
        <Card sx={{
          borderRadius: 3,
          border: '1.5px solid #fed7aa',
          bgcolor: '#fffbf5',
          boxShadow: '0 1px 6px rgba(194,65,12,0.08)',
        }}>
          <List disablePadding>
            {tasks.map((tk, i) => (
              <Box key={tk.id}>
                {i > 0 && <Divider sx={{ ml: 2 }} />}
                <ListItem sx={{ px: 2, py: 0.875, alignItems: 'flex-start', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.4 }}>
                    {tk.title}
                  </Typography>
                  {tk.dueDate && (
                    <Typography variant="caption" color="text.disabled">
                      {new Date(tk.dueDate).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onMoveToday(tk.id)}
                      sx={{ borderRadius: 2, py: 0.25, px: 1.25, fontSize: '0.7rem', fontWeight: 700, borderColor: '#7c5cff', color: '#7c5cff', minWidth: 0 }}
                    >
                      📌 {t('carryOver.moveToday')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onMoveTomorrow(tk.id)}
                      sx={{ borderRadius: 2, py: 0.25, px: 1.25, fontSize: '0.7rem', fontWeight: 700, borderColor: '#0369a1', color: '#0369a1', minWidth: 0 }}
                    >
                      ⏩ {t('carryOver.moveTomorrow')}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => onArchive(tk.id)}
                      sx={{ borderRadius: 2, py: 0.25, px: 1.25, fontSize: '0.7rem', fontWeight: 700, borderColor: '#94a3b8', color: '#64748b', minWidth: 0 }}
                    >
                      📦 {t('carryOver.archive')}
                    </Button>
                  </Box>
                </ListItem>
              </Box>
            ))}
          </List>
        </Card>
      </Collapse>
    </Box>
  )
}

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
