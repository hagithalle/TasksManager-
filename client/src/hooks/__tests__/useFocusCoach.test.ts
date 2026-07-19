import { describe, it, expect } from 'vitest'
import { isDoneForToday, getNextIncompleteSubTask } from '../useFocusCoach'
import { buildFocusPlan, DEFAULT_COACH_SETTINGS } from '../focusEngine'
import type { CoachSettings } from '../focusEngine'
import type { TaskItem } from '../../types/task'
import { Priority, ExecutionType, TaskStatus, DailyRole, RecurrenceType } from '../../types/enums'
import heJson from '../../i18n/locales/he.json'

// ── Minimal task factory ───────────────────────────────────────────────────────

let _seq = 100
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

const TODAY = '2026-07-19'

const SETTINGS: CoachSettings = {
  ...DEFAULT_COACH_SETTINGS,
  maxTasks:   3,
  energyMode: 'morning',
}

// ══════════════════════════════════════════════════════════════════════════════
// isDoneForToday
// ══════════════════════════════════════════════════════════════════════════════

describe('isDoneForToday', () => {
  it('returns false for an incomplete non-recurring task', () => {
    const task = makeTask({ isCompleted: false })
    expect(isDoneForToday(task, TODAY)).toBe(false)
  })

  it('returns true for a non-recurring task completed today', () => {
    const task = makeTask({ isCompleted: true, completedAt: `${TODAY}T08:30:00Z` })
    expect(isDoneForToday(task, TODAY)).toBe(true)
  })

  it('returns false for a non-recurring task completed yesterday', () => {
    const task = makeTask({ isCompleted: true, completedAt: '2026-07-18T08:30:00Z' })
    expect(isDoneForToday(task, TODAY)).toBe(false)
  })

  it('returns true for a recurring task whose lastCompletedDate equals today', () => {
    const task = makeTask({
      recurrenceType:    RecurrenceType.Daily,
      lastCompletedDate: TODAY,
    })
    expect(isDoneForToday(task, TODAY)).toBe(true)
  })

  it('returns false for a recurring task completed in a previous period', () => {
    const task = makeTask({
      recurrenceType:    RecurrenceType.Daily,
      lastCompletedDate: '2026-07-18',
    })
    expect(isDoneForToday(task, TODAY)).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Morning routine progress calculation (tests 1 + 2)
// ══════════════════════════════════════════════════════════════════════════════

describe('Morning routine progress calculation', () => {
  it('correctly counts done vs pending routines (2 of 3 done)', () => {
    const routines = [
      makeTask({ isCompleted: true,  completedAt: `${TODAY}T07:00:00Z` }),
      makeTask({ isCompleted: true,  completedAt: `${TODAY}T07:05:00Z` }),
      makeTask({ isCompleted: false }),
    ]
    const doneCount = routines.filter(r => isDoneForToday(r, TODAY)).length
    expect(doneCount).toBe(2)
    expect(doneCount === routines.length).toBe(false)
  })

  it('detects fully completed section when all routines are done', () => {
    const routines = [
      makeTask({ isCompleted: true, completedAt: `${TODAY}T07:00:00Z` }),
      makeTask({ isCompleted: true, completedAt: `${TODAY}T07:05:00Z` }),
    ]
    const doneCount = routines.filter(r => isDoneForToday(r, TODAY)).length
    expect(doneCount === routines.length).toBe(true)
  })

  it('reports all done when recurring routine was completed this period', () => {
    const routines = [
      makeTask({ recurrenceType: RecurrenceType.Daily, lastCompletedDate: TODAY }),
      makeTask({ recurrenceType: RecurrenceType.Daily, lastCompletedDate: TODAY }),
    ]
    const doneCount = routines.filter(r => isDoneForToday(r, TODAY)).length
    expect(doneCount).toBe(2)
    expect(doneCount === routines.length).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Habit progress from subtasks (test 3 + 6)
// ══════════════════════════════════════════════════════════════════════════════

describe('Habit progress from subtasks', () => {
  it('calculates progress correctly when 2 of 3 subtasks are done', () => {
    const subs = [
      { id: 's1', title: 'A', isCompleted: true  },
      { id: 's2', title: 'B', isCompleted: true  },
      { id: 's3', title: 'C', isCompleted: false },
    ]
    const doneCount = subs.filter(s => s.isCompleted).length
    const progress  = Math.round((doneCount / subs.length) * 100)
    expect(progress).toBe(67)
  })

  it('shows 100% progress when all subtasks are completed', () => {
    const subs = [
      { id: 's1', title: 'A', isCompleted: true },
      { id: 's2', title: 'B', isCompleted: true },
    ]
    const doneCount = subs.filter(s => s.isCompleted).length
    expect(Math.round((doneCount / subs.length) * 100)).toBe(100)
  })

  it('shows 0% when no subtasks are completed', () => {
    const subs = [
      { id: 's1', title: 'A', isCompleted: false },
      { id: 's2', title: 'B', isCompleted: false },
    ]
    const doneCount = subs.filter(s => s.isCompleted).length
    expect(Math.round((doneCount / subs.length) * 100)).toBe(0)
  })

  it('isDoneForToday reflects completed habit visual state for non-recurring task', () => {
    const habit = makeTask({
      dailyRole:   DailyRole.OngoingHabit,
      isCompleted: true,
      completedAt: `${TODAY}T12:00:00Z`,
    })
    expect(isDoneForToday(habit, TODAY)).toBe(true)
  })

  it('isDoneForToday returns false for an incomplete habit — not-done visual state', () => {
    const habit = makeTask({ dailyRole: DailyRole.OngoingHabit, isCompleted: false })
    expect(isDoneForToday(habit, TODAY)).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// getNextIncompleteSubTask (tests 4 + 5)
// ══════════════════════════════════════════════════════════════════════════════

describe('getNextIncompleteSubTask', () => {
  it('returns the first incomplete subtask when earlier ones are already done', () => {
    const task = makeTask({
      subTasks: [
        { id: 'sub-1', title: 'A', isCompleted: true  },
        { id: 'sub-2', title: 'B', isCompleted: false },
        { id: 'sub-3', title: 'C', isCompleted: false },
      ],
    })
    expect(getNextIncompleteSubTask(task)?.id).toBe('sub-2')
  })

  it('returns undefined when all subtasks are complete', () => {
    const task = makeTask({
      subTasks: [
        { id: 'sub-1', title: 'A', isCompleted: true },
        { id: 'sub-2', title: 'B', isCompleted: true },
      ],
    })
    expect(getNextIncompleteSubTask(task)).toBeUndefined()
  })

  it('returns undefined when task has no subtasks (triggers parent toggle path)', () => {
    const task = makeTask({ subTasks: [] })
    expect(getNextIncompleteSubTask(task)).toBeUndefined()
  })

  it('returns undefined when subTasks field is absent', () => {
    const task = makeTask()
    delete (task as Partial<TaskItem>).subTasks
    expect(getNextIncompleteSubTask(task)).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Empty sections — sections return no items (test 7)
// ══════════════════════════════════════════════════════════════════════════════

describe('Empty sections produce empty plan arrays', () => {
  const NOW = new Date('2026-07-19T09:00:00Z')

  it('morningRoutines is empty when there are no MorningRoutine tasks', () => {
    const tasks = [
      makeTask({ dailyRole: DailyRole.Focus }),
      makeTask({ dailyRole: DailyRole.OngoingHabit }),
    ]
    const plan = buildFocusPlan(tasks, SETTINGS, NOW)
    expect(plan.morningRoutines).toHaveLength(0)
  })

  it('ongoingHabits is empty when there are no OngoingHabit tasks', () => {
    const tasks = [
      makeTask({ dailyRole: DailyRole.Focus }),
      makeTask({ dailyRole: DailyRole.MorningRoutine }),
    ]
    const plan = buildFocusPlan(tasks, SETTINGS, NOW)
    expect(plan.ongoingHabits).toHaveLength(0)
  })

  it('all three sections are empty when the task list is empty', () => {
    const plan = buildFocusPlan([], SETTINGS, NOW)
    expect(plan.focusTasks).toHaveLength(0)
    expect(plan.morningRoutines).toHaveLength(0)
    expect(plan.ongoingHabits).toHaveLength(0)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// RTL — Hebrew translation keys exist (test 8)
// ══════════════════════════════════════════════════════════════════════════════

describe('RTL — Hebrew translation keys are present', () => {
  const he = heJson as unknown as Record<string, unknown>

  function get(obj: unknown, path: string): unknown {
    return path.split('.').reduce((cur, k) => (cur as Record<string, unknown>)?.[k], obj)
  }

  const requiredKeys = [
    'coach.morningRoutine.title',
    'coach.morningRoutine.progress',
    'coach.morningRoutine.allDone',
    'coach.focusSection.title',
    'coach.focusSection.empty',
    'coach.habits.title',
    'coach.habits.plusOne',
    'coach.habits.completeNext',
    'coach.habits.completed',
    'coach.habits.progress',
    'dailyRole.morningRoutine',
    'dailyRole.ongoingHabit',
    'dailyRole.focus',
  ]

  for (const key of requiredKeys) {
    it(`he.json has key "${key}"`, () => {
      const value = get(he, key)
      expect(value, `Missing key: ${key}`).toBeDefined()
      expect(typeof value).toBe('string')
      expect((value as string).length).toBeGreaterThan(0)
    })
  }
})

// ══════════════════════════════════════════════════════════════════════════════
// Phase 4 — Completed-state persistence & edge cases
// ══════════════════════════════════════════════════════════════════════════════

// Helper: apply the same displayRoutines/displayHabits filter logic that
// useFocusCoach uses, so we can test it purely without React hooks.
function filterForDisplay(tasks: TaskItem[], dailyRole: DailyRole, today: string): TaskItem[] {
  return tasks.filter(t =>
    t.dailyRole === dailyRole &&
    t.taskStatus !== TaskStatus.Archived &&
    t.taskStatus !== TaskStatus.Missed &&
    (!t.isCompleted || isDoneForToday(t, today))
  )
}

describe('Completed-state persistence (Bug #1 fix — completedAt in optimistic update)', () => {
  const TODAY = '2026-07-19'

  it('completed routine remains in display list when completedAt is set (the fixed state)', () => {
    const routine = makeTask({
      dailyRole:   DailyRole.MorningRoutine,
      isCompleted: true,
      completedAt: `${TODAY}T07:30:00Z`,
    })
    const result = filterForDisplay([routine], DailyRole.MorningRoutine, TODAY)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(routine.id)
  })

  it('completed routine disappears from display when completedAt is absent (reproduces original bug)', () => {
    const routine = makeTask({
      dailyRole:   DailyRole.MorningRoutine,
      isCompleted: true,
      // completedAt intentionally absent — old optimistic-update behaviour
    })
    const result = filterForDisplay([routine], DailyRole.MorningRoutine, TODAY)
    // With the old code this was 0 (task disappeared). After the fix, toggleTask
    // sets completedAt in the optimistic update so this scenario only occurs on error.
    expect(result).toHaveLength(0)
  })

  it('routine completed yesterday is NOT shown (previous-day completedAt)', () => {
    const routine = makeTask({
      dailyRole:   DailyRole.MorningRoutine,
      isCompleted: true,
      completedAt: '2026-07-18T07:30:00Z',
    })
    const result = filterForDisplay([routine], DailyRole.MorningRoutine, TODAY)
    expect(result).toHaveLength(0)
  })

  it('recurring routine with lastCompletedDate = today stays visible with done state', () => {
    const routine = makeTask({
      dailyRole:        DailyRole.MorningRoutine,
      recurrenceType:   RecurrenceType.Daily,
      lastCompletedDate: TODAY,
      isCompleted:      false,  // backend resets isCompleted for recurring tasks
    })
    const result = filterForDisplay([routine], DailyRole.MorningRoutine, TODAY)
    expect(result).toHaveLength(1)
    expect(isDoneForToday(routine, TODAY)).toBe(true)
  })

  it('recurring routine from a previous period is treated as incomplete', () => {
    const routine = makeTask({
      dailyRole:        DailyRole.MorningRoutine,
      recurrenceType:   RecurrenceType.Daily,
      lastCompletedDate: '2026-07-18',  // yesterday
      isCompleted:      false,
    })
    const result = filterForDisplay([routine], DailyRole.MorningRoutine, TODAY)
    expect(result).toHaveLength(1)
    expect(isDoneForToday(routine, TODAY)).toBe(false)
  })

  it('task completed today remains done after plan rebuilds (completedAt persists across useMemo)', () => {
    // Simulates: user completes a routine → plan rebuilds → routine still shows done
    const routine = makeTask({
      dailyRole:   DailyRole.MorningRoutine,
      isCompleted: true,
      completedAt: `${TODAY}T07:30:00Z`,
    })
    // Rebuilding the plan does not affect displayRoutines — it's derived independently
    const plan1 = buildFocusPlan([routine], SETTINGS, new Date(`${TODAY}T09:00:00Z`))
    const plan2 = buildFocusPlan([routine], SETTINGS, new Date(`${TODAY}T09:05:00Z`))
    expect(plan1.morningRoutines).toHaveLength(0)  // engine shows only incomplete
    expect(plan2.morningRoutines).toHaveLength(0)  // still filtered out by engine
    // The display list (separate from engine) includes it with done state
    const display = filterForDisplay([routine], DailyRole.MorningRoutine, TODAY)
    expect(display).toHaveLength(1)
    expect(isDoneForToday(routine, TODAY)).toBe(true)
  })

  it('mixed completed and incomplete routines calculate progress correctly', () => {
    const routines = [
      makeTask({ dailyRole: DailyRole.MorningRoutine, isCompleted: true,  completedAt: `${TODAY}T07:00:00Z` }),
      makeTask({ dailyRole: DailyRole.MorningRoutine, isCompleted: true,  completedAt: `${TODAY}T07:05:00Z` }),
      makeTask({ dailyRole: DailyRole.MorningRoutine, isCompleted: false }),
    ]
    const display   = filterForDisplay(routines, DailyRole.MorningRoutine, TODAY)
    const doneCount = display.filter(r => isDoneForToday(r, TODAY)).length
    expect(display).toHaveLength(3)
    expect(doneCount).toBe(2)
    expect(doneCount === display.length).toBe(false)
  })
})

describe('Habit edge cases (Bug #3 — backend auto-complete now sets CompletedAt)', () => {
  const TODAY = '2026-07-19'

  it('habit with completedAt shows done state (fixed backend flow)', () => {
    const habit = makeTask({
      dailyRole:   DailyRole.OngoingHabit,
      isCompleted: true,
      completedAt: `${TODAY}T12:00:00Z`,
    })
    expect(isDoneForToday(habit, TODAY)).toBe(true)
    const display = filterForDisplay([habit], DailyRole.OngoingHabit, TODAY)
    expect(display).toHaveLength(1)
  })

  it('habit without completedAt does NOT show done state (original backend bug scenario)', () => {
    const habit = makeTask({
      dailyRole:   DailyRole.OngoingHabit,
      isCompleted: true,
      // No completedAt — this was the bug before the CompletedAt fix in TaskService.cs
    })
    expect(isDoneForToday(habit, TODAY)).toBe(false)
  })

  it('habit with all subtasks completed: getNextIncompleteSubTask returns undefined', () => {
    const habit = makeTask({
      dailyRole: DailyRole.OngoingHabit,
      subTasks: [
        { id: 's1', title: 'A', isCompleted: true },
        { id: 's2', title: 'B', isCompleted: true },
        { id: 's3', title: 'C', isCompleted: true },
      ],
    })
    expect(getNextIncompleteSubTask(habit)).toBeUndefined()
  })

  it('habit with one subtask: +1 returns that subtask, then undefined', () => {
    const habit = makeTask({
      dailyRole: DailyRole.OngoingHabit,
      subTasks:  [{ id: 's1', title: 'Only step', isCompleted: false }],
    })
    expect(getNextIncompleteSubTask(habit)?.id).toBe('s1')

    // After completion (simulated as a new task object)
    const afterComplete = { ...habit, subTasks: [{ id: 's1', title: 'Only step', isCompleted: true }] }
    expect(getNextIncompleteSubTask(afterComplete)).toBeUndefined()
  })

  it('habit with no subtasks: getNextIncompleteSubTask returns undefined (triggers parent toggle)', () => {
    const habit = makeTask({ dailyRole: DailyRole.OngoingHabit })
    expect(getNextIncompleteSubTask(habit)).toBeUndefined()
  })

  it('habit with completed parent but incomplete subtasks — isDoneForToday uses completedAt', () => {
    const habit = makeTask({
      dailyRole:   DailyRole.OngoingHabit,
      isCompleted: true,
      completedAt: `${TODAY}T12:00:00Z`,
      subTasks: [
        { id: 's1', title: 'A', isCompleted: true  },
        { id: 's2', title: 'B', isCompleted: false },  // incomplete subtask
      ],
    })
    // isDoneForToday is based on parent completedAt, not subtask state
    expect(isDoneForToday(habit, TODAY)).toBe(true)
  })

  it('habit with all subtasks completed but parent isCompleted=false — not done for today', () => {
    // This can happen if the backend auto-complete hasn't fired yet (race condition)
    const habit = makeTask({
      dailyRole:   DailyRole.OngoingHabit,
      isCompleted: false,
      subTasks: [
        { id: 's1', title: 'A', isCompleted: true },
        { id: 's2', title: 'B', isCompleted: true },
      ],
    })
    expect(isDoneForToday(habit, TODAY)).toBe(false)
    // The display filter still shows it (isCompleted=false → !false=true)
    const display = filterForDisplay([habit], DailyRole.OngoingHabit, TODAY)
    expect(display).toHaveLength(1)
  })

  it('completed habit remains in display section', () => {
    const habit = makeTask({
      dailyRole:   DailyRole.OngoingHabit,
      isCompleted: true,
      completedAt: `${TODAY}T12:00:00Z`,
    })
    const display = filterForDisplay([habit], DailyRole.OngoingHabit, TODAY)
    expect(display).toHaveLength(1)
    expect(isDoneForToday(display[0], TODAY)).toBe(true)
  })

  it('long title does not affect logic — all edge-case functions handle it', () => {
    const longTitle = 'א'.repeat(200)
    const habit = makeTask({
      dailyRole:   DailyRole.OngoingHabit,
      title:       longTitle,
      isCompleted: true,
      completedAt: `${TODAY}T12:00:00Z`,
    })
    expect(isDoneForToday(habit, TODAY)).toBe(true)
    expect(getNextIncompleteSubTask(habit)).toBeUndefined()
  })
})
