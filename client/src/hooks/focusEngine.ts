import type { TaskItem } from '../types/task'
import { Priority, ExecutionType, TaskNature, TaskStatus, RecurrenceType } from '../types/enums'

// ── Public types ───────────────────────────────────────────────────────────────

export type EnergyMode = 'morning' | 'afternoon' | 'evening'

export type ReasonKey =
  | 'overdue' | 'dueToday' | 'dueTomorrow' | 'dueSoon'
  | 'criticalPriority' | 'highPriority'
  | 'frog' | 'linkedToGoal' | 'quickWin' | 'waitingDays'
  | 'morningDeepWork' | 'eveningLightTask'
  | 'carriedOver' | 'actionableSubtask'

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
  recommendations:  ScoredRecommendation[]
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

// ── Step 1: extract meetings / appointments → Today's Schedule ────────────────

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

function flattenCandidates(tasks: TaskItem[]): FlatCandidate[] {
  const result: FlatCandidate[] = []

  for (const task of tasks) {
    if (task.isCompleted) continue
    if (isCompletedInCurrentPeriod(task)) continue
    if (task.taskStatus === TaskStatus.Archived || task.taskStatus === TaskStatus.Missed) continue

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

function isEligible(c: FlatCandidate, scheduledIds: Set<string>): boolean {
  if (scheduledIds.has(c.sourceTask.id)) return false
  if (!c.isSubTask && c.plannedTime) return false
  if (isCompletedInCurrentPeriod(c.sourceTask)) return false
  return true
}

// ── Step 4: score a candidate ─────────────────────────────────────────────────

interface ScoreCtx {
  now:        Date
  today:      string
  energyMode: EnergyMode
  frogKey?:   string
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
  if (c.goalId) { pts += 10; reasons.push('linkedToGoal') }

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

  // ── Carried over ──────────────────────────────────────────────────────────
  if (c.taskStatus === TaskStatus.CarriedOver) { pts += 5; reasons.push('carriedOver') }

  // ── Subtask bonus (prefer actionable chunks over big tasks) ───────────────
  if (c.isSubTask) { pts += 5; reasons.push('actionableSubtask') }

  return { pts, reasons }
}

// ── Step 5: build the final plan ──────────────────────────────────────────────

export function buildFocusPlan(
  tasks:    TaskItem[],
  settings: CoachSettings,
  now:      Date = new Date(),
): FocusPlan {
  const today      = now.toISOString().slice(0, 10)
  const energyMode = settings.energyMode === 'auto'
    ? getEnergyMode(now.getHours())
    : settings.energyMode

  // Available time until target
  const [th, tm]   = settings.targetTime.split(':').map(Number)
  const targetDate = new Date(now)
  targetDate.setHours(th, tm, 0, 0)
  const availableMinutes = Math.max(0, Math.floor((targetDate.getTime() - now.getTime()) / 60_000))
  // 17.5 % buffer for interruptions; if target already passed use Infinity so we don't skip tasks
  const usableMinutes = availableMinutes > 0
    ? Math.floor(availableMinutes * 0.825)
    : Infinity

  // Scheduled events (meetings / appointments today)
  const scheduledEvents = extractScheduledEvents(tasks)
  const scheduledIds    = new Set(scheduledEvents.map(e => e.task.id))

  // Flatten and filter candidates
  const flat     = flattenCandidates(tasks)
  const eligible = flat.filter(c => isEligible(c, scheduledIds))

  // Frog: highest-priority candidate due today
  const todayCands = eligible.filter(c => c.dueDate === today)
  const frogCand   = [...todayCands].sort((a, b) => {
    const o: Record<Priority, number> = {
      [Priority.Critical]: 0, [Priority.High]: 1, [Priority.Medium]: 2, [Priority.Low]: 3,
    }
    return (o[a.priority] ?? 3) - (o[b.priority] ?? 3)
  })[0]

  // Score and sort
  const ctx: ScoreCtx = { now, today, energyMode, frogKey: frogCand?.key }
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

  // Greedy time-budget selection with soft diversity enforcement
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

    selected.push(rec)
    remaining -= rec.estimatedMinutes
    typeCount.set(rec.candidate.executionType, tc + 1)
  }

  // Fallback: at least show the top-scoring task even if it doesn't fit
  if (selected.length === 0 && scored.length > 0) {
    selected.push(scored[0])
  }

  const usedMinutes = selected.reduce((sum, r) => sum + r.estimatedMinutes, 0)

  // Next upcoming scheduled event today
  const nextEvent = scheduledEvents.find(e => {
    const [h, m] = e.time.split(':').map(Number)
    const eventAt = new Date(now)
    eventAt.setHours(h, m, 0, 0)
    return eventAt > now
  })

  return { recommendations: selected, scheduledEvents, availableMinutes, usedMinutes, energyMode, nextEvent }
}
