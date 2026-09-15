import type { TaskItem } from '../types/task'
import { Priority, ExecutionType, TaskNature, TaskStatus, RecurrenceType, DailyRole } from '../types/enums'

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Minimal goal metadata passed into the engine.
 * Kept separate from the full Goal API model so the engine stays decoupled.
 */
export interface GoalMeta {
  /** ISO 'yyyy-MM-dd', only relevant for Finite goals */
  dueDate?: string
  /** false = completed or archived — task gets no goal-based boost */
  isActive: boolean
}

export type EnergyMode = 'morning' | 'afternoon' | 'evening'

export type ReasonKey =
  | 'overdue' | 'dueToday' | 'dueTomorrow' | 'dueSoon'
  | 'criticalPriority' | 'highPriority'
  | 'frog' | 'linkedToGoal' | 'quickWin' | 'waitingDays'
  | 'morningDeepWork' | 'eveningLightTask'
  | 'carriedOver' | 'missed' | 'actionableSubtask'

/** A task (or subtask) flattened into a recommendation candidate. */
export interface FlatCandidate {
  /** Stable React key */
  key: string
  /** Source task id — passed to onToggle(id) */
  id: string
  /** If this is a subtask, the subTask.id — passed to onToggleSubTask(id, subTaskId) */
  subTaskId?: string
  title: string
  priority: Priority
  executionType: ExecutionType
  durationMinutes?: number
  dueDate?: string
  goalId?: string
  taskStatus?: TaskStatus
  taskNature?: TaskNature
  plannedTime?: string
  createdAt: string
  isSubTask: boolean
  parentTitle?: string
  sourceTask: TaskItem
}

export interface ScoredRecommendation {
  candidate: FlatCandidate
  score: number
  reasons: ReasonKey[]
  estimatedMinutes: number
}

export interface ScheduledEvent {
  task: TaskItem
  time: string   // "HH:mm"
}

export interface CoachSettings {
  targetTime:  string
  maxTasks:    number
  energyMode:  'auto' | EnergyMode
}

export const DEFAULT_COACH_SETTINGS: CoachSettings = {
  targetTime: '11:00',
  maxTasks:   5,
  energyMode: 'auto',
}

export interface FocusPlan {
  /** Scored & selected focus tasks (respects maxTasks). Was `recommendations` in Phase 1. */
  focusTasks:       ScoredRecommendation[]
  /** Incomplete morning-routine tasks for the current period. Not scored, preserves server order. */
  morningRoutines:  TaskItem[]
  /** Incomplete ongoing-habit tasks for the current period. Not scored, preserves server order. */
  ongoingHabits:    TaskItem[]
  scheduledEvents:  ScheduledEvent[]
  availableMinutes: number
  usedMinutes:      number
  energyMode:       EnergyMode
  nextEvent?:       ScheduledEvent
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function estimateDuration(durationMinutes?: number, executionType?: string): number {
  if (durationMinutes != null && durationMinutes > 0) return durationMinutes
  switch (executionType) {
    case ExecutionType.Quick:  return 5
    case ExecutionType.Short:  return 15
    case ExecutionType.Medium: return 35
    case ExecutionType.Long:   return 90
    default:                   return 20
  }
}

export function getEnergyMode(hour: number): EnergyMode {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00').getTime()
  const b = new Date(to   + 'T00:00:00').getTime()
  return Math.round((b - a) / 86_400_000)
}

/** Returns true when a recurring task was already completed in its current period. */
export function isCompletedInCurrentPeriod(task: TaskItem): boolean {
  if (!task.recurrenceType || task.recurrenceType === RecurrenceType.None) return false
  if (!task.lastCompletedDate) return false

  const today = new Date()
  const lcd   = new Date(task.lastCompletedDate + 'T00:00:00')

  switch (task.recurrenceType) {
    case RecurrenceType.Daily:
      return lcd.toDateString() === today.toDateString()
    case RecurrenceType.Weekly: {
      const startOfWeek = (d: Date) => {
        const day = d.getDay()            // 0 = Sunday
        const diff = (day === 0 ? -6 : 1) - day   // offset to Monday
        const mon = new Date(d)
        mon.setDate(d.getDate() + diff)
        mon.setHours(0, 0, 0, 0)
        return mon
      }
      return startOfWeek(lcd) >= startOfWeek(today)
    }
    case RecurrenceType.Monthly:
      return lcd.getFullYear() === today.getFullYear() && lcd.getMonth() === today.getMonth()
    default:
      return false
  }
}

// ── Daily-role partition ───────────────────────────────────────────────────────
// This split happens before every other engine step so that non-Focus tasks
// (and their subtasks) can never enter the focus scoring or scheduled-event flow.

function isFocusTask(task: TaskItem): boolean {
  return !task.dailyRole || task.dailyRole === DailyRole.Focus
}

/** Common visibility predicate for non-Focus groups (routines / habits). */
function isVisibleNonFocus(task: TaskItem): boolean {
  return (
    !task.isCompleted &&
    !isCompletedInCurrentPeriod(task) &&
    task.taskStatus !== TaskStatus.Archived &&
    task.taskStatus !== TaskStatus.Missed
  )
}

// ── Step 1: extract meetings / appointments → Today's Schedule ────────────────
// Only called with the Focus task sub-list.

export function extractScheduledEvents(tasks: TaskItem[]): ScheduledEvent[] {
  return tasks
    .filter(t =>
      !t.isCompleted &&
      !isCompletedInCurrentPeriod(t) &&
      t.taskStatus !== TaskStatus.Archived &&
      t.taskStatus !== TaskStatus.Missed &&
      !!t.plannedTime
    )
    .map(t => ({ task: t, time: t.plannedTime! }))
    .sort((a, b) => a.time.localeCompare(b.time))
}

// ── Step 2: flatten tasks into FlatCandidate[] ────────────────────────────────
// Parent tasks with open subtasks are replaced by those subtasks.
// Only called with the Focus task sub-list.

function flattenCandidates(tasks: TaskItem[]): FlatCandidate[] {
  const result: FlatCandidate[] = []

  for (const task of tasks) {
    if (task.isCompleted) continue
    if (isCompletedInCurrentPeriod(task)) continue
    if (task.taskStatus === TaskStatus.Archived) continue
    // Missed tasks (past scheduled time, not completed) resurface as focus candidates

    const openSubs = task.subTasks?.filter(s => !s.isCompleted) ?? []

    if (openSubs.length > 0) {
      for (const sub of openSubs) {
        result.push({
          key:             `sub-${sub.id}`,
          id:              task.id,
          subTaskId:       sub.id,
          title:           sub.title,
          priority:        sub.priority ?? task.priority,
          executionType:   sub.executionType ?? task.executionType,
          durationMinutes: sub.durationMinutes,
          dueDate:         sub.dueDate ?? task.dueDate,
          goalId:          task.goalId,
          taskStatus:      task.taskStatus,
          taskNature:      undefined,   // subtasks cannot be meetings
          plannedTime:     undefined,   // subtasks cannot have fixed time
          createdAt:       task.createdAt,
          isSubTask:       true,
          parentTitle:     task.title,
          sourceTask:      task,
        })
      }
    } else {
      result.push({
        key:             `task-${task.id}`,
        id:              task.id,
        title:           task.title,
        priority:        task.priority,
        executionType:   task.executionType,
        durationMinutes: task.durationMinutes,
        dueDate:         task.dueDate,
        goalId:          task.goalId,
        taskStatus:      task.taskStatus,
        taskNature:      task.taskNature,
        plannedTime:     task.plannedTime,
        createdAt:       task.createdAt,
        isSubTask:       false,
        sourceTask:      task,
      })
    }
  }

  return result
}

// ── Step 3: filter eligible candidates ────────────────────────────────────────

function isEligible(c: FlatCandidate, scheduledIds: Set<string>, goalMeta: Record<string, GoalMeta>): boolean {
  if (scheduledIds.has(c.sourceTask.id)) return false
  // Tasks with a plannedTime are normally routed to the schedule strip, not focus.
  // Exception: Missed tasks — their time has passed, they are no longer in the strip
  // (extractScheduledEvents excludes Missed), so they are eligible as focus candidates.
  if (!c.isSubTask && c.plannedTime && c.taskStatus !== TaskStatus.Missed) return false
  if (isCompletedInCurrentPeriod(c.sourceTask)) return false
  // Exclude tasks whose linked goal is known to be archived or completed.
  // If the goal is absent from goalMeta (historical data mismatch), we let it through
  // so we don't accidentally hide tasks — the user can fix the link manually.
  if (c.goalId) {
    const meta = goalMeta[c.goalId]
    if (meta && !meta.isActive) return false
  }
  return true
}

// ── Step 4: score a candidate ─────────────────────────────────────────────────

interface ScoreCtx {
  now:        Date
  today:      string
  energyMode: EnergyMode
  frogKey?:   string
  goalMeta:   Record<string, GoalMeta>
}

function computeScore(c: FlatCandidate, ctx: ScoreCtx): { pts: number; reasons: ReasonKey[] } {
  let pts = 0
  const reasons: ReasonKey[] = []

  // ── Due-date urgency ──────────────────────────────────────────────────────
  if (c.dueDate) {
    const d = daysBetween(ctx.today, c.dueDate)
    if      (d < 0)  { pts += 40; reasons.push('overdue')     }
    else if (d === 0) { pts += 30; reasons.push('dueToday')    }
    else if (d === 1) { pts += 20; reasons.push('dueTomorrow') }
    else if (d <= 3)  { pts += 10; reasons.push('dueSoon')     }
    else if (d <= 7)    pts +=  5
  }

  // ── Priority ──────────────────────────────────────────────────────────────
  const pMap: Record<Priority, number> = {
    [Priority.Critical]: 30, [Priority.High]: 20,
    [Priority.Medium]:   10, [Priority.Low]:   0,
  }
  pts += pMap[c.priority] ?? 0
  if (c.priority === Priority.Critical)      reasons.push('criticalPriority')
  else if (c.priority === Priority.High)     reasons.push('highPriority')

  // ── Frog (highest-priority today task) ───────────────────────────────────
  if (ctx.frogKey && ctx.frogKey === c.key) { pts += 15; reasons.push('frog') }

  // ── Linked to a goal ─────────────────────────────────────────────────────
  // Completed / archived goals suppress the boost entirely.
  // Active goals score by proximity to the goal's dueDate (capped at +18).
  if (c.goalId) {
    const meta = ctx.goalMeta[c.goalId]
    if (!meta || meta.isActive) {
      let goalPts = 8  // base: unknown goal or active with no dueDate or distant dueDate
      if (meta?.dueDate) {
        const d = daysBetween(ctx.today, meta.dueDate)
        if      (d <= 7)  goalPts = 18
        else if (d <= 30) goalPts = 12
      }
      pts += goalPts
      reasons.push('linkedToGoal')
    }
  }

  // ── Duration fit (shorter fits = easier to slot in) ──────────────────────
  const mins = estimateDuration(c.durationMinutes, c.executionType)
  if      (mins <= 15) { pts += 10; reasons.push('quickWin') }
  else if (mins <= 30)   pts +=  7
  else if (mins <= 60)   pts +=  5
  else                   pts +=  2

  // ── Days waiting (tasks left untouched for too long float up) ─────────────
  const daysWaiting = Math.floor(
    (ctx.now.getTime() - new Date(c.createdAt).getTime()) / 86_400_000
  )
  pts += Math.min(Math.floor(daysWaiting * 1.5), 15)
  if (daysWaiting >= 3) reasons.push('waitingDays')

  // ── Energy alignment ──────────────────────────────────────────────────────
  if (ctx.energyMode === 'morning') {
    const deep      = c.executionType === ExecutionType.Long || c.executionType === ExecutionType.Medium
    const important = c.priority === Priority.Critical || c.priority === Priority.High
    if (deep && important) { pts += 10; reasons.push('morningDeepWork') }
    else if (deep)           pts +=  5
  } else if (ctx.energyMode === 'afternoon') {
    pts += c.executionType === ExecutionType.Medium ? 8 : 3
  } else {
    const light = c.executionType === ExecutionType.Quick || c.executionType === ExecutionType.Short
    if (light) { pts += 10; reasons.push('eveningLightTask') }
    else         pts +=  2
  }

  // ── Carried over / previously missed ─────────────────────────────────────
  if (c.taskStatus === TaskStatus.CarriedOver) { pts += 5; reasons.push('carriedOver') }
  // Missed: was explicitly scheduled but not completed — slightly stronger signal
  if (c.taskStatus === TaskStatus.Missed)      { pts += 8; reasons.push('missed') }

  // ── Carry-over escalation: gradual urgency boost based on days overdue ────
  // dueDate is guaranteed present for both CarriedOver and Missed (server sets
  // status only when DueDate < today).  Capped at 12 pts so a long-waiting
  // medium-priority task doesn't outrank a Critical task due today.
  if ((c.taskStatus === TaskStatus.CarriedOver || c.taskStatus === TaskStatus.Missed) && c.dueDate) {
    const daysOverdue = Math.max(0, -daysBetween(ctx.today, c.dueDate))
    pts += Math.min(Math.floor(daysOverdue * 2), 12)
  }

  // ── Subtask bonus (prefer actionable chunks over big tasks) ───────────────
  if (c.isSubTask) { pts += 5; reasons.push('actionableSubtask') }

  return { pts, reasons }
}

// ── Step 5: build the final plan ──────────────────────────────────────────────

export function buildFocusPlan(
  tasks:    TaskItem[],
  settings: CoachSettings,
  now:      Date = new Date(),
  goalMeta: Record<string, GoalMeta> = {},
): FocusPlan {
  const today      = now.toISOString().slice(0, 10)
  const energyMode = settings.energyMode === 'auto'
    ? getEnergyMode(now.getHours())
    : settings.energyMode

  // Raw time until target (before deducting commitments)
  const [th, tm]        = settings.targetTime.split(':').map(Number)
  const targetDate      = new Date(now)
  targetDate.setHours(th, tm, 0, 0)
  const rawAvailableMinutes = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 60_000))

  // ── Partition by dailyRole (must happen before all other steps) ────────────
  const focusPool   = tasks.filter(isFocusTask)
  const routinePool = tasks.filter(t => t.dailyRole === DailyRole.MorningRoutine)
  const habitPool   = tasks.filter(t => t.dailyRole === DailyRole.OngoingHabit)

  // Non-Focus groups: simple visibility filter, server order preserved
  const morningRoutines = routinePool.filter(isVisibleNonFocus)
  const ongoingHabits   = habitPool.filter(isVisibleNonFocus)

  // Scheduled events (Focus tasks only — routines/habits never enter the schedule strip)
  const scheduledEvents = extractScheduledEvents(focusPool)
  const scheduledIds    = new Set(scheduledEvents.map(e => e.task.id))

  // Deduct committed time: scheduled events + pending routines/habits (already
  // filtered for completion, so completed items are not double-subtracted).
  // The three pools are mutually exclusive by dailyRole, so no double-counting.
  const committedMinutes =
    scheduledEvents.reduce((s, e) => s + estimateDuration(e.task.durationMinutes, e.task.executionType), 0) +
    morningRoutines.reduce((s, t) => s + estimateDuration(t.durationMinutes, t.executionType), 0) +
    ongoingHabits.reduce(  (s, t) => s + estimateDuration(t.durationMinutes, t.executionType), 0)

  const availableMinutes = Math.max(0, rawAvailableMinutes - committedMinutes)
  // 17.5 % buffer for interruptions; if target already passed use Infinity so we don't skip tasks
  const usableMinutes = rawAvailableMinutes > 0
    ? Math.floor(availableMinutes * 0.825)
    : Infinity

  // Flatten and filter Focus candidates
  const flat     = flattenCandidates(focusPool)
  const eligible = flat.filter(c => isEligible(c, scheduledIds, goalMeta))

  // Frog: highest-priority candidate due today
  const todayCands = eligible.filter(c => c.dueDate === today)
  const frogCand   = [...todayCands].sort((a, b) => {
    const o: Record<Priority, number> = {
      [Priority.Critical]: 0, [Priority.High]: 1, [Priority.Medium]: 2, [Priority.Low]: 3,
    }
    return (o[a.priority] ?? 3) - (o[b.priority] ?? 3)
  })[0]

  // Score and sort
  const ctx: ScoreCtx = { now, today, energyMode, frogKey: frogCand?.key, goalMeta }
  const scored: ScoredRecommendation[] = eligible.map(c => {
    const { pts, reasons } = computeScore(c, ctx)
    return {
      candidate:        c,
      score:            pts,
      reasons,
      estimatedMinutes: estimateDuration(c.durationMinutes, c.executionType),
    }
  })
  scored.sort((a, b) => b.score - a.score)

  // Greedy selection: score-ordered, time-budget-aware, soft diversity enforced
  const selected: ScoredRecommendation[] = []
  let remaining = usableMinutes
  const typeCount = new Map<string, number>()

  for (const rec of scored) {
    if (selected.length >= settings.maxTasks) break

    // Soft diversity: prefer variety over 3+ tasks of the same executionType
    const tc = typeCount.get(rec.candidate.executionType) ?? 0
    if (tc >= 2) {
      const hasAlternative = scored.some(x =>
        !selected.includes(x) &&
        x.candidate.executionType !== rec.candidate.executionType
      )
      if (hasAlternative) continue
    }

    // Time-budget: skip tasks that would exceed remaining time when a fitting
    // alternative exists. Only allow an over-budget task when nothing has been
    // selected yet AND no smaller task fits — so the plan is never left empty.
    if (rec.estimatedMinutes > remaining) {
      const hasFitting = scored.some(x =>
        !selected.includes(x) &&
        x.estimatedMinutes <= remaining
      )
      if (hasFitting || selected.length > 0) continue
      // selected.length === 0 && !hasFitting: fall through — allow top task
    }

    selected.push(rec)
    remaining -= rec.estimatedMinutes
    typeCount.set(rec.candidate.executionType, tc + 1)

    // Once the budget is consumed (including the over-budget fallback), stop
    if (remaining <= 0) break
  }

  const usedMinutes = selected.reduce((sum, r) => sum + r.estimatedMinutes, 0)

  // Next upcoming scheduled event today
  const nextEvent = scheduledEvents.find(e => {
    const [h, m] = e.time.split(':').map(Number)
    const eventAt = new Date(now)
    eventAt.setHours(h, m, 0, 0)
    return eventAt > now
  })

  return {
    focusTasks: selected,
    morningRoutines,
    ongoingHabits,
    scheduledEvents,
    availableMinutes,
    usedMinutes,
    energyMode,
    nextEvent,
  }
}

/**
 * Returns active goals that have no focus task selected in today's plan.
 * Used by Smart Coach to decide which goals to generate AI suggestions for.
 * Goals without at least one linked task in `plan.focusTasks` are "uncovered."
 */
export function identifyUncoveredGoals(
  plan:  FocusPlan,
  goals: { id: string; isCompleted?: boolean; isArchived?: boolean }[]
): string[] {
  const coveredGoalIds = new Set(
    plan.focusTasks
      .map(r => r.candidate.goalId)
      .filter((id): id is string => !!id)
  )
  return goals
    .filter(g => !g.isCompleted && !g.isArchived && !coveredGoalIds.has(g.id))
    .map(g => g.id)
}
