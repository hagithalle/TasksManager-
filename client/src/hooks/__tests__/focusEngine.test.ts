import { describe, it, expect } from 'vitest'
import { buildFocusPlan, DEFAULT_COACH_SETTINGS } from '../focusEngine'
import type { CoachSettings, GoalMeta } from '../focusEngine'
import type { TaskItem } from '../../types/task'
import {
  Priority, ExecutionType, RecurrenceType, TaskStatus, DailyRole,
} from '../../types/enums'

// ── Minimal task factory ───────────────────────────────────────────────────────

let _seq = 1
function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  const id = `task-${_seq++}`
  return {
    id,
    title:         overrides.title ?? `Task ${id}`,
    isCompleted:   false,
    priority:      Priority.Medium,
    executionType: ExecutionType.Short,
    taskStatus:    TaskStatus.Open,
    createdAt:     '2026-01-01T00:00:00Z',
    updatedAt:     '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const SETTINGS: CoachSettings = {
  ...DEFAULT_COACH_SETTINGS,
  maxTasks:   3,
  energyMode: 'morning',
}

// Fixed "now" so tests are deterministic — morning slot
const NOW = new Date('2026-07-19T09:00:00Z')

// ══════════════════════════════════════════════════════════════════════════════
// Test 1 — MorningRoutine does not count toward maxTasks
// ══════════════════════════════════════════════════════════════════════════════
describe('DailyRole partitioning', () => {
  it('1. MorningRoutine does not count toward maxTasks', () => {
    const routine = makeTask({ dailyRole: DailyRole.MorningRoutine, title: 'Make bed' })
    const focuses = [1, 2, 3, 4].map(i =>
      makeTask({ dailyRole: DailyRole.Focus, title: `Focus ${i}` })
    )
    const plan = buildFocusPlan([routine, ...focuses], SETTINGS, NOW)

    expect(plan.focusTasks.length).toBe(SETTINGS.maxTasks)
    expect(plan.morningRoutines).toHaveLength(1)
    expect(plan.morningRoutines[0].id).toBe(routine.id)
    const focusTaskIds = plan.focusTasks.map(r => r.candidate.id)
    expect(focusTaskIds).not.toContain(routine.id)
  })

  // ── Test 2 — OngoingHabit does not count toward maxTasks ──────────────────
  it('2. OngoingHabit does not count toward maxTasks', () => {
    const habit = makeTask({ dailyRole: DailyRole.OngoingHabit, title: 'Drink water' })
    const focuses = [1, 2, 3, 4].map(i =>
      makeTask({ dailyRole: DailyRole.Focus, title: `Focus ${i}` })
    )
    const plan = buildFocusPlan([habit, ...focuses], SETTINGS, NOW)

    expect(plan.focusTasks.length).toBe(SETTINGS.maxTasks)
    expect(plan.ongoingHabits).toHaveLength(1)
    expect(plan.ongoingHabits[0].id).toBe(habit.id)
    const focusIds = plan.focusTasks.map(r => r.candidate.id)
    expect(focusIds).not.toContain(habit.id)
  })

  // ── Test 3 — Focus tasks still respect maxTasks ───────────────────────────
  it('3. Focus tasks still respect maxTasks', () => {
    const focuses = [1, 2, 3, 4, 5].map(i =>
      makeTask({ dailyRole: DailyRole.Focus, title: `Focus ${i}` })
    )
    const plan = buildFocusPlan(focuses, SETTINGS, NOW)
    expect(plan.focusTasks.length).toBe(SETTINGS.maxTasks)
  })

  // ── Test 4 — MorningRoutine subtasks do not leak into focusTasks ──────────
  it('4. MorningRoutine with subtasks does not leak subtasks into focusTasks', () => {
    const subA = { id: 'sub-a', title: 'Sub A', isCompleted: false }
    const subB = { id: 'sub-b', title: 'Sub B', isCompleted: false }
    const routine = makeTask({
      dailyRole: DailyRole.MorningRoutine,
      title: 'Morning routine parent',
      subTasks: [subA, subB],
    })
    const focus = makeTask({ dailyRole: DailyRole.Focus, title: 'Real focus task' })
    const plan = buildFocusPlan([routine, focus], SETTINGS, NOW)

    const allFocusTitles = plan.focusTasks.map(r => r.candidate.title)
    expect(allFocusTitles).not.toContain('Sub A')
    expect(allFocusTitles).not.toContain('Sub B')
    expect(allFocusTitles).not.toContain('Morning routine parent')

    // parent is still in morningRoutines with subtasks intact
    expect(plan.morningRoutines).toHaveLength(1)
    expect(plan.morningRoutines[0].subTasks).toHaveLength(2)
  })

  // ── Test 5 — OngoingHabit subtasks do not leak into focusTasks ───────────
  it('5. OngoingHabit with subtasks does not leak subtasks into focusTasks', () => {
    const subs = [
      { id: 'h-sub-1', title: 'Glass 1', isCompleted: false },
      { id: 'h-sub-2', title: 'Glass 2', isCompleted: false },
      { id: 'h-sub-3', title: 'Glass 3', isCompleted: false },
    ]
    const habit = makeTask({
      dailyRole: DailyRole.OngoingHabit,
      title: 'Drink 3 glasses',
      subTasks: subs,
    })
    const focus = makeTask({ dailyRole: DailyRole.Focus })
    const plan = buildFocusPlan([habit, focus], SETTINGS, NOW)

    const allFocusTitles = plan.focusTasks.map(r => r.candidate.title)
    expect(allFocusTitles).not.toContain('Glass 1')
    expect(allFocusTitles).not.toContain('Drink 3 glasses')
    expect(plan.ongoingHabits).toHaveLength(1)
    expect(plan.ongoingHabits[0].subTasks).toHaveLength(3)
  })

  // ── Test 6 — MorningRoutine with plannedTime does not enter scheduledEvents
  it('6. MorningRoutine with plannedTime does not enter scheduledEvents', () => {
    const routine = makeTask({
      dailyRole: DailyRole.MorningRoutine,
      plannedTime: '07:00',
    })
    const plan = buildFocusPlan([routine], SETTINGS, NOW)

    expect(plan.scheduledEvents).toHaveLength(0)
    expect(plan.morningRoutines).toHaveLength(1)
  })

  // ── Test 7 — OngoingHabit with plannedTime does not enter scheduledEvents ─
  it('7. OngoingHabit with plannedTime does not enter scheduledEvents', () => {
    const habit = makeTask({
      dailyRole: DailyRole.OngoingHabit,
      plannedTime: '12:00',
    })
    const plan = buildFocusPlan([habit], SETTINGS, NOW)

    expect(plan.scheduledEvents).toHaveLength(0)
    expect(plan.ongoingHabits).toHaveLength(1)
  })

  // ── Test 8 — Focus task with plannedTime still enters scheduledEvents ─────
  it('8. Focus task with plannedTime still enters scheduledEvents', () => {
    const focusMeeting = makeTask({
      dailyRole: DailyRole.Focus,
      plannedTime: '10:00',
      title: 'Stand-up meeting',
    })
    const plan = buildFocusPlan([focusMeeting], SETTINGS, NOW)

    expect(plan.scheduledEvents).toHaveLength(1)
    expect(plan.scheduledEvents[0].task.id).toBe(focusMeeting.id)
    // Should NOT appear in focusTasks (it's a scheduled event, not a selectable task)
    const ftIds = plan.focusTasks.map(r => r.candidate.id)
    expect(ftIds).not.toContain(focusMeeting.id)
  })

  // ── Test 9 — Completed recurring routine is excluded for the current period
  it('9. Completed recurring routine is excluded for the current period', () => {
    // isCompletedInCurrentPeriod uses new Date() internally, so lastCompletedDate
    // and the 'now' passed to buildFocusPlan must both match actual today.
    const actualNow = new Date()
    const today     = actualNow.toISOString().slice(0, 10)
    const routine = makeTask({
      dailyRole:         DailyRole.MorningRoutine,
      recurrenceType:    RecurrenceType.Daily,
      lastCompletedDate: today,
    })
    const plan = buildFocusPlan([routine], SETTINGS, actualNow)
    expect(plan.morningRoutines).toHaveLength(0)
  })

  // ── Test 10 — Focus scoring is unchanged for Focus tasks ─────────────────
  it('10. Overdue focus task scores higher than a non-urgent focus task', () => {
    const overdue = makeTask({
      dailyRole: DailyRole.Focus,
      title:     'Overdue task',
      priority:  Priority.High,
      dueDate:   '2026-07-10',   // 9 days ago
    })
    const fresh = makeTask({
      dailyRole: DailyRole.Focus,
      title:     'Fresh task',
      priority:  Priority.Low,
    })
    const plan = buildFocusPlan([overdue, fresh], SETTINGS, NOW)

    expect(plan.focusTasks.length).toBeGreaterThan(0)
    // Overdue + high-priority task must appear first
    expect(plan.focusTasks[0].candidate.id).toBe(overdue.id)
    // It must carry the 'overdue' and 'highPriority' reasons
    expect(plan.focusTasks[0].reasons).toContain('overdue')
    expect(plan.focusTasks[0].reasons).toContain('highPriority')
  })

  // ── Bonus: tasks without explicit dailyRole default to Focus behavior ──────
  it('Bonus: task with no dailyRole defaults to focus pool', () => {
    const legacyTask = makeTask({ title: 'Legacy task with no dailyRole' })
    // dailyRole is undefined — should behave like Focus
    delete (legacyTask as any).dailyRole
    const plan = buildFocusPlan([legacyTask], SETTINGS, NOW)
    expect(plan.focusTasks.length).toBe(1)
    expect(plan.morningRoutines).toHaveLength(0)
    expect(plan.ongoingHabits).toHaveLength(0)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Time-budget enforcement
// ──────────────────────────────────────────────────────────────────────────────
// Helper: fix 'now' at 08:00 local and set targetTime N minutes later.
// buildFocusPlan uses setHours (local) for both sides, so availableMinutes == N
// regardless of the machine's timezone.
// usableMinutes = floor(N * 0.825)  e.g. 45 → 37, 90 → 74
// ══════════════════════════════════════════════════════════════════════════════

function timedPlan(availableMinutes: number, tasks: TaskItem[], maxTasks = 10) {
  const now = new Date()
  now.setHours(8, 0, 0, 0)
  const target = new Date(now.getTime() + availableMinutes * 60_000)
  const hh = target.getHours().toString().padStart(2, '0')
  const mm = target.getMinutes().toString().padStart(2, '0')
  const settings: CoachSettings = { maxTasks, targetTime: `${hh}:${mm}`, energyMode: 'morning' }
  return buildFocusPlan(tasks, settings, now)
}

// Tasks scored so that their intrinsic order is: BIG > SMALL > MEDIUM
// BIG  = 60 min, Critical + Long  → highest score (morning deep-work bonus applies)
// SMALL = 15 min, High    + Quick → second
// MED  = 20 min, Medium   + Short → third
// All created on a fixed old date so aging is identical and doesn't break order.
const OLD_DATE = '2026-01-01T00:00:00Z'

function bigTask(id: string): TaskItem {
  return makeTask({ id, title: id, priority: Priority.Critical,
    executionType: ExecutionType.Long,  durationMinutes: 60, createdAt: OLD_DATE, updatedAt: OLD_DATE })
}
function smallTask(id: string): TaskItem {
  return makeTask({ id, title: id, priority: Priority.High,
    executionType: ExecutionType.Quick, durationMinutes: 15, createdAt: OLD_DATE, updatedAt: OLD_DATE })
}
function medTask(id: string): TaskItem {
  return makeTask({ id, title: id, priority: Priority.Medium,
    executionType: ExecutionType.Short, durationMinutes: 20, createdAt: OLD_DATE, updatedAt: OLD_DATE })
}

describe('Time-budget enforcement', () => {

  // ── Test B1 ──────────────────────────────────────────────────────────────────
  // 45 min available (usable ≈ 37): tasks of 15, 20, and 60 min.
  // The 60-min task has the highest score but must be skipped because 15+20 fit.
  it('B1: 45 min available — prefers fitting 15+20 min tasks over higher-scored 60 min', () => {
    const big   = bigTask('big')
    const small = smallTask('small')
    const med   = medTask('med')

    const plan = timedPlan(45, [big, small, med])

    const ids = plan.focusTasks.map(r => r.candidate.sourceTask.id)
    expect(ids).toContain('small')
    expect(ids).toContain('med')
    expect(ids).not.toContain('big')

    const totalMin = plan.focusTasks.reduce((s, r) => s + r.estimatedMinutes, 0)
    expect(totalMin).toBeLessThanOrEqual(Math.floor(45 * 0.825))
  })

  // ── Test B2 ──────────────────────────────────────────────────────────────────
  // 45 min available, only a 60-min task — must still be selected (fallback).
  it('B2: 45 min available, only a 60 min task — selects it as fallback', () => {
    const big = bigTask('only-big')

    const plan = timedPlan(45, [big])

    expect(plan.focusTasks).toHaveLength(1)
    expect(plan.focusTasks[0].candidate.sourceTask.id).toBe('only-big')
  })

  // ── Test B3 ──────────────────────────────────────────────────────────────────
  // 90 min available (usable ≈ 74): two 30-min tasks fit; remaining 14 min leaves
  // no room for the 50-min or 60-min tasks, which must be excluded.
  it('B3: 90 min available — fills budget with fitting tasks, excludes those that no longer fit', () => {
    const p = makeTask({ id: 'P', title: 'P', priority: Priority.Critical,
      executionType: ExecutionType.Medium, durationMinutes: 30, createdAt: OLD_DATE, updatedAt: OLD_DATE })
    const q = makeTask({ id: 'Q', title: 'Q', priority: Priority.High,
      executionType: ExecutionType.Medium, durationMinutes: 30, createdAt: OLD_DATE, updatedAt: OLD_DATE })
    const r = makeTask({ id: 'R', title: 'R', priority: Priority.Medium,
      executionType: ExecutionType.Short,  durationMinutes: 50, createdAt: OLD_DATE, updatedAt: OLD_DATE })
    const s = makeTask({ id: 'S', title: 'S', priority: Priority.Low,
      executionType: ExecutionType.Long,   durationMinutes: 60, createdAt: OLD_DATE, updatedAt: OLD_DATE })

    const plan = timedPlan(90, [p, q, r, s])

    const ids = plan.focusTasks.map(r => r.candidate.sourceTask.id)
    expect(ids).toContain('P')
    expect(ids).toContain('Q')
    expect(ids).not.toContain('R')
    expect(ids).not.toContain('S')

    const usable = Math.floor(90 * 0.825)
    const total  = plan.focusTasks.reduce((s, r) => s + r.estimatedMinutes, 0)
    expect(total).toBeLessThanOrEqual(usable)
  })

  // ── Test B4 ──────────────────────────────────────────────────────────────────
  // maxTasks still caps even when budget would allow more.
  it('B4: maxTasks cap is respected even when all tasks fit within the time budget', () => {
    const tiny = (id: string) => makeTask({ id, title: id, priority: Priority.Medium,
      executionType: ExecutionType.Quick, durationMinutes: 5, createdAt: OLD_DATE, updatedAt: OLD_DATE })
    const tasks = ['t1','t2','t3','t4','t5','t6'].map(tiny)

    // 90 min available, 6 × 5 min = 30 min total — fits, but maxTasks = 3
    const plan = timedPlan(90, tasks, 3)
    expect(plan.focusTasks).toHaveLength(3)
  })

  // ── Test B5 ──────────────────────────────────────────────────────────────────
  // Highest-scored task is slightly over budget (50 min vs ~37 usable) and no
  // fitting alternative exists — must be selected rather than returning empty.
  it('B5: single task slightly over budget with no alternative — selected as fallback', () => {
    const slightly = makeTask({ id: 'over', title: 'over', priority: Priority.Critical,
      executionType: ExecutionType.Long, durationMinutes: 50, createdAt: OLD_DATE, updatedAt: OLD_DATE })

    const plan = timedPlan(45, [slightly])  // usable ≈ 37, task = 50

    expect(plan.focusTasks).toHaveLength(1)
    expect(plan.focusTasks[0].candidate.sourceTask.id).toBe('over')
  })

  // ── Test B6 ──────────────────────────────────────────────────────────────────
  // When target time has already passed, usableMinutes = Infinity and the engine
  // falls back to pure score+maxTasks behaviour (no tasks are excluded by time).
  it('B6: target time already passed — behaves as before (no time-based exclusion)', () => {
    const tasks = ['a','b','c','d'].map(id =>
      makeTask({ id, title: id, priority: Priority.Medium,
        executionType: ExecutionType.Long, durationMinutes: 120,
        createdAt: OLD_DATE, updatedAt: OLD_DATE })
    )
    // targetTime in the past relative to now
    const now = new Date('2026-07-19T09:00:00Z')
    const settings: CoachSettings = { maxTasks: 3, targetTime: '08:00', energyMode: 'morning' }
    const plan = buildFocusPlan(tasks, settings, now)

    // All tasks are 120 min, target passed → Infinity budget → only maxTasks limits
    expect(plan.focusTasks).toHaveLength(3)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Committed-time deduction
// ──────────────────────────────────────────────────────────────────────────────
// Helper: same 8 AM anchor as timedPlan, returns the full plan so tests can
// inspect availableMinutes directly.
// ══════════════════════════════════════════════════════════════════════════════

function commitPlan(rawMinutes: number, tasks: TaskItem[], now?: Date) {
  const base = now ?? new Date()
  base.setHours(8, 0, 0, 0)
  const target = new Date(base.getTime() + rawMinutes * 60_000)
  const hh = target.getHours().toString().padStart(2, '0')
  const mm = target.getMinutes().toString().padStart(2, '0')
  const settings: CoachSettings = { maxTasks: 10, targetTime: `${hh}:${mm}`, energyMode: 'morning' }
  return buildFocusPlan(tasks, settings, base)
}

describe('Committed-time deduction', () => {

  // ── Test C1 ──────────────────────────────────────────────────────────────────
  it('C1: no events or routines — availableMinutes equals raw time to target', () => {
    const focus = makeTask({ dailyRole: DailyRole.Focus, durationMinutes: 30 })
    const plan = commitPlan(60, [focus])
    expect(plan.availableMinutes).toBe(60)
  })

  // ── Test C2 ──────────────────────────────────────────────────────────────────
  it('C2: one scheduled event (30 min) deducted from availableMinutes', () => {
    const event = makeTask({ dailyRole: DailyRole.Focus, plannedTime: '09:00', durationMinutes: 30 })
    const focus = makeTask({ dailyRole: DailyRole.Focus, durationMinutes: 15 })
    const plan = commitPlan(60, [event, focus])
    expect(plan.availableMinutes).toBe(30)   // 60 − 30
  })

  // ── Test C3 ──────────────────────────────────────────────────────────────────
  it('C3: multiple scheduled events — each duration deducted', () => {
    const e1 = makeTask({ dailyRole: DailyRole.Focus, plannedTime: '08:30', durationMinutes: 20 })
    const e2 = makeTask({ dailyRole: DailyRole.Focus, plannedTime: '09:00', durationMinutes: 20 })
    const plan = commitPlan(60, [e1, e2])
    expect(plan.availableMinutes).toBe(20)   // 60 − 20 − 20
  })

  // ── Test C4 ──────────────────────────────────────────────────────────────────
  // A recurring routine completed today is excluded by isVisibleNonFocus and
  // therefore must NOT be subtracted from available time.
  it('C4: completed recurring routine is not deducted', () => {
    const actualNow = new Date()
    actualNow.setHours(8, 0, 0, 0)
    const today = actualNow.toISOString().slice(0, 10)

    const completedRoutine = makeTask({
      dailyRole:         DailyRole.MorningRoutine,
      durationMinutes:   30,
      recurrenceType:    RecurrenceType.Daily,
      lastCompletedDate: today,
    })
    const plan = commitPlan(60, [completedRoutine], actualNow)
    expect(plan.availableMinutes).toBe(60)   // No deduction
  })

  // ── Test C5 ──────────────────────────────────────────────────────────────────
  it('C5: scheduled event + morning routine — both durations deducted', () => {
    const event   = makeTask({ dailyRole: DailyRole.Focus,          plannedTime: '09:00', durationMinutes: 30 })
    const routine = makeTask({ dailyRole: DailyRole.MorningRoutine, durationMinutes: 20 })
    const plan = commitPlan(90, [event, routine])
    expect(plan.availableMinutes).toBe(40)   // 90 − 30 − 20
  })

  // ── Test C6 ──────────────────────────────────────────────────────────────────
  it('C6: commitments exceed available time — availableMinutes clamped to 0', () => {
    const event   = makeTask({ dailyRole: DailyRole.Focus,          plannedTime: '08:30', durationMinutes: 60 })
    const routine = makeTask({ dailyRole: DailyRole.MorningRoutine, durationMinutes: 60 })
    const plan = commitPlan(90, [event, routine])   // 60+60=120 > 90
    expect(plan.availableMinutes).toBe(0)
  })

  // ── Test C7 ──────────────────────────────────────────────────────────────────
  // Event is in focusPool, routine is in routinePool — mutually exclusive pools,
  // so each is counted exactly once (no double-counting).
  it('C7: event and routine counted once each — no double-counting', () => {
    const event   = makeTask({ dailyRole: DailyRole.Focus,          plannedTime: '09:00', durationMinutes: 30 })
    const routine = makeTask({ dailyRole: DailyRole.MorningRoutine, durationMinutes: 30 })
    const plan = commitPlan(90, [event, routine])
    expect(plan.availableMinutes).toBe(30)   // 90 − 30 − 30 = 30 (not 90−60−60=−30)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Missed-task resurfacing
// ──────────────────────────────────────────────────────────────────────────────
// A task with a past plannedTime that was not completed is marked Missed by the
// server. It should resurface in Smart Coach but NOT in the schedule strip.
// ══════════════════════════════════════════════════════════════════════════════

describe('Missed-task resurfacing', () => {

  // A Missed task: Focus, has plannedTime (yesterday), status = Missed, not completed
  function missedTask(overrides: Partial<TaskItem> = {}): TaskItem {
    return makeTask({
      dailyRole:   DailyRole.Focus,
      plannedTime: '14:00',
      dueDate:     '2026-07-18',  // yesterday relative to NOW (2026-07-19)
      taskStatus:  TaskStatus.Missed,
      ...overrides,
    })
  }

  // ── Test M1 ──────────────────────────────────────────────────────────────────
  it('M1: missed task with past plannedTime resurfaces in focusTasks', () => {
    const task = missedTask({ id: 'missed-1', title: 'Missed meeting prep' })
    const plan = buildFocusPlan([task], SETTINGS, NOW)

    expect(plan.focusTasks).toHaveLength(1)
    expect(plan.focusTasks[0].candidate.id).toBe('missed-1')
  })

  // ── Test M2 ──────────────────────────────────────────────────────────────────
  it('M2: missed task does NOT appear in scheduledEvents', () => {
    const task = missedTask({ id: 'missed-2' })
    const plan = buildFocusPlan([task], SETTINGS, NOW)

    const stripIds = plan.scheduledEvents.map(e => e.task.id)
    expect(stripIds).not.toContain('missed-2')
  })

  // ── Test M3 ──────────────────────────────────────────────────────────────────
  it('M3: completed missed task does not resurface', () => {
    const task = missedTask({ id: 'missed-3', isCompleted: true })
    const plan = buildFocusPlan([task], SETTINGS, NOW)

    const focusIds = plan.focusTasks.map(r => r.candidate.id)
    expect(focusIds).not.toContain('missed-3')
  })

  // ── Test M4 ──────────────────────────────────────────────────────────────────
  it('M4: archived task stays hidden regardless of plannedTime', () => {
    const task = makeTask({
      id:          'archived-1',
      dailyRole:   DailyRole.Focus,
      plannedTime: '14:00',
      taskStatus:  TaskStatus.Archived,
    })
    const plan = buildFocusPlan([task], SETTINGS, NOW)

    const focusIds  = plan.focusTasks.map(r => r.candidate.id)
    const stripIds  = plan.scheduledEvents.map(e => e.task.id)
    expect(focusIds).not.toContain('archived-1')
    expect(stripIds).not.toContain('archived-1')
  })

  // ── Test M5 ──────────────────────────────────────────────────────────────────
  // Missed task carries the 'missed' reason and scores strictly higher than an
  // otherwise identical Open task (same priority, same dueDate, no other bonuses).
  it('M5: missed task receives the \'missed\' reason and scores higher than an equivalent open task', () => {
    const base = {
      priority:        Priority.Medium,
      executionType:   ExecutionType.Short,
      dueDate:         '2026-07-18',
      createdAt:       OLD_DATE,
      updatedAt:       OLD_DATE,
    }
    const missed = missedTask({ id: 'scored-missed', ...base })
    const open   = makeTask({ id: 'scored-open',   dailyRole: DailyRole.Focus, ...base })

    const plan = buildFocusPlan([missed, open], SETTINGS, NOW)

    // Missed task must appear first (higher score)
    expect(plan.focusTasks[0].candidate.id).toBe('scored-missed')
    // It must carry the 'missed' reason
    expect(plan.focusTasks[0].reasons).toContain('missed')
    // Open task must still appear (it's eligible)
    const ids = plan.focusTasks.map(r => r.candidate.id)
    expect(ids).toContain('scored-open')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// CarriedOver escalation
// ──────────────────────────────────────────────────────────────────────────────
// Tests use NOW = '2026-07-19T09:00:00Z' so ctx.today = '2026-07-19'.
// All tasks share OLD_DATE createdAt so waitingDays pts are identical and cancel
// out when comparing pairs.
//
// Score breakdown for a Medium+Short CarriedOver task (no goal, no frog):
//   +10  Priority.Medium
//   +40  overdue (dueDate < today)
//   +10  quickWin (Short → estimateDuration=15 ≤ 15)
//   +15  waitingDays (capped, OLD_DATE = 199 days ago)
//   +5   CarriedOver base
//   +E   escalation = min(floor(daysOverdue * 2), 12)
//   ────────────────────────────────────────────────────
//   = 80 + E
// ══════════════════════════════════════════════════════════════════════════════

describe('CarriedOver escalation', () => {

  function carriedTask(id: string, dueDate: string): TaskItem {
    return makeTask({
      id,
      title:         id,
      dailyRole:     DailyRole.Focus,
      taskStatus:    TaskStatus.CarriedOver,
      priority:      Priority.Medium,
      executionType: ExecutionType.Short,
      dueDate,
      createdAt:     OLD_DATE,
      updatedAt:     OLD_DATE,
    })
  }

  // ── Test E1 ──────────────────────────────────────────────────────────────────
  // 1 day overdue: escalation = floor(1*2) = 2  →  total = 80+5+2 = 87
  // vs Open equivalent: 80 (no CarriedOver/escalation)  → carried wins by 7
  it('E1: newly carried task scores above an otherwise identical fresh Open task', () => {
    const carried = carriedTask('e1-carried', '2026-07-18')  // 1 day overdue
    const open    = makeTask({
      id: 'e1-open', title: 'e1-open', dailyRole: DailyRole.Focus,
      priority: Priority.Medium, executionType: ExecutionType.Short,
      dueDate: '2026-07-18', createdAt: OLD_DATE, updatedAt: OLD_DATE,
    })
    const plan = buildFocusPlan([carried, open], SETTINGS, NOW)

    expect(plan.focusTasks[0].candidate.id).toBe('e1-carried')
    expect(plan.focusTasks[0].reasons).toContain('carriedOver')
  })

  // ── Test E2 ──────────────────────────────────────────────────────────────────
  // Compare 1-day-overdue vs 5-day-overdue tasks.
  // 1 day: escalation=2  → total=87
  // 5 days: escalation=10 → total=95
  it('E2: task carried for several days scores higher than a newly-carried task', () => {
    const recent = carriedTask('e2-recent', '2026-07-18')  // 1 day overdue
    const older  = carriedTask('e2-older',  '2026-07-14')  // 5 days overdue

    const plan = buildFocusPlan([recent, older], SETTINGS, NOW)

    const ids = plan.focusTasks.map(r => r.candidate.id)
    expect(ids.indexOf('e2-older')).toBeLessThan(ids.indexOf('e2-recent'))
  })

  // ── Test E3 ──────────────────────────────────────────────────────────────────
  // Escalation is capped: 6 days → min(12,12)=12 and 14 days → min(28,12)=12.
  // Both tasks should have the same score and appear in either order.
  it('E3: escalation is capped — 6-day and 14-day overdue tasks score identically', () => {
    const sixDay    = carriedTask('e3-six',     '2026-07-13')  // 6 days  → cap
    const fourteenDay = carriedTask('e3-fourteen', '2026-07-05') // 14 days → cap

    const plan = buildFocusPlan([sixDay, fourteenDay], { ...SETTINGS, maxTasks: 2 }, NOW)

    const recs = plan.focusTasks
    const scores = Object.fromEntries(recs.map(r => [r.candidate.id, r.score]))
    expect(scores['e3-six']).toBe(scores['e3-fourteen'])
  })

  // ── Test E4 ──────────────────────────────────────────────────────────────────
  // A Critical task due TODAY (the "frog") must outrank even a long-standing
  // CarriedOver task.
  //
  // Critical+dueToday+frog score (Short, OLD_DATE, goalId present):
  //   +30 Critical  +30 dueToday  +15 frog  +10 quickWin  +10 goalId  +15 waitingDays = 110
  //
  // CarriedOver Medium, 6 days overdue (cap hit):
  //   +10 +40 +10 +15 +5 +12 = 92
  it('E4: escalation does not overwhelm a genuinely urgent Critical/due-today task', () => {
    const urgent = makeTask({
      id: 'e4-critical', title: 'e4-critical',
      dailyRole:     DailyRole.Focus,
      priority:      Priority.Critical,
      executionType: ExecutionType.Short,
      dueDate:       '2026-07-19',   // today → frog candidate
      goalId:        'goal-1',
      createdAt:     OLD_DATE,
      updatedAt:     OLD_DATE,
    })
    const longCarried = carriedTask('e4-carried', '2026-07-13')  // 6 days, hits cap

    const plan = buildFocusPlan([urgent, longCarried], SETTINGS, NOW)

    expect(plan.focusTasks[0].candidate.id).toBe('e4-critical')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Goal-aware scoring
// ──────────────────────────────────────────────────────────────────────────────
// Tests use NOW = '2026-07-19T09:00:00Z' (ctx.today = '2026-07-19').
// Base task: Medium priority, Short execution, OLD_DATE createdAt, no dueDate.
// Base score (no goal): 10(Med) + 10(quickWin) + 15(waitingDays) = 35
//
// Goal scoring bands (all Active goals):
//   no meta or no dueDate or > 30 days  → +8
//   dueDate 8–30 days                   → +12
//   dueDate ≤ 7 days                    → +18
//   completed / archived goal           → +0
// ══════════════════════════════════════════════════════════════════════════════

describe('Goal-aware scoring', () => {

  function goalTask(id: string, goalId: string): TaskItem {
    return makeTask({
      id,
      title:         id,
      dailyRole:     DailyRole.Focus,
      priority:      Priority.Medium,
      executionType: ExecutionType.Short,
      goalId,
      createdAt:     OLD_DATE,
      updatedAt:     OLD_DATE,
    })
  }

  function noGoalTask(id: string): TaskItem {
    return makeTask({
      id,
      title:         id,
      dailyRole:     DailyRole.Focus,
      priority:      Priority.Medium,
      executionType: ExecutionType.Short,
      createdAt:     OLD_DATE,
      updatedAt:     OLD_DATE,
    })
  }

  function meta(overrides: Partial<GoalMeta> & { isActive: boolean }): Record<string, GoalMeta> {
    return { 'g1': { ...overrides } }
  }

  // ── Test G1 ──────────────────────────────────────────────────────────────────
  // Active goal with no dueDate → base boost (+8), reason 'linkedToGoal' fires
  it('G1: active goal with no dueDate adds base boost (+8) and linkedToGoal reason', () => {
    const task = goalTask('g1-task', 'g1')
    const plan = buildFocusPlan([task], SETTINGS, NOW, meta({ isActive: true }))

    expect(plan.focusTasks).toHaveLength(1)
    const rec = plan.focusTasks[0]
    expect(rec.reasons).toContain('linkedToGoal')
    // Score: 10+10+15+8 = 43
    expect(rec.score).toBe(43)
  })

  // ── Test G2 ──────────────────────────────────────────────────────────────────
  // Active goal with dueDate in 3 days (≤7) → near boost (+18)
  it('G2: active goal due in 3 days (≤7) adds near boost (+18)', () => {
    const task = goalTask('g2-task', 'g1')
    const plan = buildFocusPlan(
      [task], SETTINGS, NOW,
      meta({ isActive: true, dueDate: '2026-07-22' })  // 3 days out
    )
    const rec = plan.focusTasks[0]
    expect(rec.reasons).toContain('linkedToGoal')
    expect(rec.score).toBe(53)  // 10+10+15+18
  })

  // ── Test G3 ──────────────────────────────────────────────────────────────────
  // Active goal with dueDate in 20 days (8–30) → mid boost (+12)
  it('G3: active goal due in 20 days (8–30) adds mid boost (+12)', () => {
    const task = goalTask('g3-task', 'g1')
    const plan = buildFocusPlan(
      [task], SETTINGS, NOW,
      meta({ isActive: true, dueDate: '2026-08-08' })  // 20 days out
    )
    const rec = plan.focusTasks[0]
    expect(rec.score).toBe(47)  // 10+10+15+12
  })

  // ── Test G4 ──────────────────────────────────────────────────────────────────
  // Active goal with dueDate in 60 days (>30) → base boost (+8, same as no dueDate)
  it('G4: active goal due in 60 days (>30) adds only base boost (+8)', () => {
    const task = goalTask('g4-task', 'g1')
    const plan = buildFocusPlan(
      [task], SETTINGS, NOW,
      meta({ isActive: true, dueDate: '2026-09-17' })  // 60 days out
    )
    const rec = plan.focusTasks[0]
    expect(rec.score).toBe(43)  // 10+10+15+8 — same as no-dueDate case
  })

  // ── Test G5 ──────────────────────────────────────────────────────────────────
  // Completed goal → no boost at all; task scores as if it had no goalId
  it('G5: completed goal adds no boost — task scores as if ungrouped', () => {
    const withGoal    = goalTask('g5-goal', 'g1')
    const withoutGoal = noGoalTask('g5-no-goal')
    const plan = buildFocusPlan(
      [withGoal, withoutGoal],
      { ...SETTINGS, maxTasks: 5 },
      NOW,
      meta({ isActive: false })  // completed goal
    )
    const scores = Object.fromEntries(plan.focusTasks.map(r => [r.candidate.id, r.score]))
    // Both should score identically (no goal boost for either)
    expect(scores['g5-goal']).toBe(scores['g5-no-goal'])
    // Neither should carry the linkedToGoal reason
    const goalRec = plan.focusTasks.find(r => r.candidate.id === 'g5-goal')!
    expect(goalRec.reasons).not.toContain('linkedToGoal')
  })

  // ── Test G6 ──────────────────────────────────────────────────────────────────
  // Archived goal → same as completed: no boost
  it('G6: archived goal adds no boost', () => {
    const task = goalTask('g6-task', 'g1')
    const plan = buildFocusPlan(
      [task], SETTINGS, NOW,
      meta({ isActive: false })  // archived goal
    )
    const rec = plan.focusTasks[0]
    expect(rec.reasons).not.toContain('linkedToGoal')
    expect(rec.score).toBe(35)  // 10+10+15 — no goal boost
  })

  // ── Test G7 ──────────────────────────────────────────────────────────────────
  // Task has goalId but goalMeta map is empty (unknown goal) → safe fallback of +8
  it('G7: unknown goal (not in goalMeta) falls back to base boost (+8)', () => {
    const task = goalTask('g7-task', 'g1')
    const plan = buildFocusPlan([task], SETTINGS, NOW)  // no goalMeta passed
    const rec = plan.focusTasks[0]
    expect(rec.reasons).toContain('linkedToGoal')
    expect(rec.score).toBe(43)  // 10+10+15+8
  })

  // ── Test G8 ──────────────────────────────────────────────────────────────────
  // Goal urgency does not overwhelm a Critical / due-today task.
  // Near-goal task: Medium + near goal (+18) + waitingDays + quickWin = 53
  // Critical + dueToday (frog) task: 30+30+15+10+15(frog) = 100
  it('G8: goal urgency does not overwhelm a Critical/due-today task', () => {
    const urgentTask = makeTask({
      id: 'g8-urgent', title: 'g8-urgent',
      dailyRole:     DailyRole.Focus,
      priority:      Priority.Critical,
      executionType: ExecutionType.Short,
      dueDate:       '2026-07-19',  // today → frog
      createdAt:     OLD_DATE,
      updatedAt:     OLD_DATE,
    })
    const nearGoalTask = goalTask('g8-goal', 'g1')
    const plan = buildFocusPlan(
      [urgentTask, nearGoalTask],
      SETTINGS,
      NOW,
      meta({ isActive: true, dueDate: '2026-07-22' })  // 3 days → +18
    )
    expect(plan.focusTasks[0].candidate.id).toBe('g8-urgent')
  })
})
