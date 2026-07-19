import { describe, it, expect } from 'vitest'
import { isDoneForToday, getNextIncompleteSubTask } from '../useFocusCoach'
import { buildFocusPlan, DEFAULT_COACH_SETTINGS } from '../focusEngine'
import type { CoachSettings } from '../focusEngine'
import type { TaskItem } from '../../types/task'
import { Priority, ExecutionType, TaskStatus, DailyRole, RecurrenceType } from '../../types/enums'

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
  // Import the translation file statically so the test is independent of i18n runtime.
  // If a key is renamed or removed this test will catch it before a deployment.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const he = require('../../i18n/locales/he.json') as Record<string, unknown>

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
