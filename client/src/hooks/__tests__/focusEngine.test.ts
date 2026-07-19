import { describe, it, expect } from 'vitest'
import { buildFocusPlan, DEFAULT_COACH_SETTINGS } from '../focusEngine'
import type { CoachSettings } from '../focusEngine'
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
    const today = NOW.toISOString().slice(0, 10)   // '2026-07-19'
    const routine = makeTask({
      dailyRole:        DailyRole.MorningRoutine,
      recurrenceType:   RecurrenceType.Daily,
      lastCompletedDate: today,   // completed today → excluded
    })
    const plan = buildFocusPlan([routine], SETTINGS, NOW)
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
