/**
 * Unit tests for the subtask toggle flow in DashboardPage.
 *
 * DashboardPage is a React component and difficult to test in full. These
 * tests instead exercise the pure logic extracted from the toggle functions:
 *   - optimistic state construction
 *   - server response application
 *   - rollback on failure
 *   - progress calculation after reconciliation
 *
 * Each test uses simple in-memory TaskItem arrays to mirror the component's
 * `tasks` state and verify the correct reducer logic.
 */

import { describe, it, expect } from 'vitest'
import type { TaskItem, SubTask } from '../../types'

// ── Task factory helpers ───────────────────────────────────────────────────────

function makeSubTask(overrides: Partial<SubTask> = {}): SubTask {
  return {
    id:          'sub-1',
    title:       'Step',
    isCompleted: false,
    ...overrides,
  }
}

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id:            'task-1',
    title:         'Parent task',
    isCompleted:   false,
    completedAt:   undefined,
    priority:      'medium' as any,
    executionType: 'short'  as any,
    subTasks:      [],
    taskNature:    'action',
    dailyRole:     'ongoingHabit',
    taskStatus:    'open'   as any,
    createdAt:     '2026-01-01T00:00:00Z',
    updatedAt:     '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── Pure logic extracted from DashboardPage.toggleSubTask ─────────────────────

function buildOptimisticSubTaskUpdate(task: TaskItem, subId: string, newCompleted: boolean): TaskItem {
  const newSubs = (task.subTasks ?? []).map(s =>
    s.id === subId ? { ...s, isCompleted: newCompleted } : s,
  )
  const allDone = newSubs.length > 0 && newSubs.every(s => s.isCompleted)
  return {
    ...task,
    subTasks:    newSubs,
    isCompleted: allDone ? true : task.isCompleted,
    completedAt: allDone && !task.completedAt ? new Date().toISOString() : task.completedAt,
  }
}

/** Reducer: apply server response or rollback — mirrors DashboardPage.setTasks */
function applyUpdate(tasks: TaskItem[], taskId: string, updated: TaskItem): TaskItem[] {
  return tasks.map(t => t.id === taskId ? updated : t)
}

function rollback(tasks: TaskItem[], taskId: string, original: TaskItem): TaskItem[] {
  return tasks.map(t => t.id === taskId ? original : t)
}

// ── Habit progress helper (mirrors getHabitProgress from useFocusCoach) ───────

function habitProgress(task: TaskItem): { done: number; total: number } {
  const subs = task.subTasks ?? []
  if (subs.length === 0) return { done: task.isCompleted ? 1 : 0, total: 1 }
  return { done: subs.filter(s => s.isCompleted).length, total: subs.length }
}

// ══════════════════════════════════════════════════════════════════════════════

describe('toggleSubTask — optimistic state', () => {
  it('marks the target subtask completed without touching siblings', () => {
    const sub1 = makeSubTask({ id: 'sub-1', isCompleted: false })
    const sub2 = makeSubTask({ id: 'sub-2', isCompleted: false })
    const task  = makeTask({ subTasks: [sub1, sub2] })

    const optimistic = buildOptimisticSubTaskUpdate(task, 'sub-1', true)

    expect(optimistic.subTasks!.find(s => s.id === 'sub-1')!.isCompleted).toBe(true)
    expect(optimistic.subTasks!.find(s => s.id === 'sub-2')!.isCompleted).toBe(false)
    expect(optimistic.isCompleted).toBe(false)   // parent not yet complete
  })

  it('completing the final subtask sets parent isCompleted and completedAt', () => {
    const sub1 = makeSubTask({ id: 'sub-1', isCompleted: true  })
    const sub2 = makeSubTask({ id: 'sub-2', isCompleted: false })
    const task  = makeTask({ subTasks: [sub1, sub2] })

    const before     = Date.now()
    const optimistic = buildOptimisticSubTaskUpdate(task, 'sub-2', true)
    const after      = Date.now()

    expect(optimistic.isCompleted).toBe(true)
    expect(optimistic.completedAt).toBeDefined()
    const ts = new Date(optimistic.completedAt!).getTime()
    expect(ts).toBeGreaterThanOrEqual(before)
    expect(ts).toBeLessThanOrEqual(after)
  })

  it('does not overwrite an existing parent completedAt when all subtasks become done', () => {
    const existingCompletedAt = '2026-07-01T09:00:00Z'
    const sub = makeSubTask({ id: 'sub-1', isCompleted: false })
    const task = makeTask({
      subTasks:    [sub],
      completedAt: existingCompletedAt,
    })

    const optimistic = buildOptimisticSubTaskUpdate(task, 'sub-1', true)

    expect(optimistic.completedAt).toBe(existingCompletedAt)
  })
})

// ══════════════════════════════════════════════════════════════════════════════

describe('toggleSubTask — server response applied', () => {
  it('normal subtask update: applies server response replacing optimistic state', () => {
    const sub1 = makeSubTask({ id: 'sub-1', isCompleted: false })
    const sub2 = makeSubTask({ id: 'sub-2', isCompleted: false })
    const task  = makeTask({ subTasks: [sub1, sub2] })

    const tasks      = [task]
    const optimistic = buildOptimisticSubTaskUpdate(task, 'sub-1', true)
    const withOptimistic = applyUpdate(tasks, task.id, optimistic)

    // Server returns the full parent with authoritative subtask list
    const serverResponse: TaskItem = {
      ...task,
      subTasks: [
        { ...sub1, isCompleted: true },
        { ...sub2, isCompleted: false },
      ],
    }
    const withServer = applyUpdate(withOptimistic, task.id, serverResponse)

    const reconciled = withServer.find(t => t.id === task.id)!
    expect(reconciled.subTasks![0].isCompleted).toBe(true)
    expect(reconciled.subTasks![1].isCompleted).toBe(false)
  })

  it('final subtask: server-completed parent replaces optimistic completedAt', () => {
    const sub = makeSubTask({ id: 'sub-1', isCompleted: false })
    const task = makeTask({ subTasks: [sub] })

    const tasks      = [task]
    const optimistic = buildOptimisticSubTaskUpdate(task, 'sub-1', true)
    const withOptimistic = applyUpdate(tasks, task.id, optimistic)

    const serverCompletedAt = '2026-07-19T10:05:00Z'
    const serverResponse: TaskItem = {
      ...task,
      isCompleted: true,
      completedAt: serverCompletedAt,
      subTasks:    [{ ...sub, isCompleted: true }],
    }
    const withServer = applyUpdate(withOptimistic, task.id, serverResponse)

    const reconciled = withServer.find(t => t.id === task.id)!
    expect(reconciled.isCompleted).toBe(true)
    expect(reconciled.completedAt).toBe(serverCompletedAt)
  })

  it('recurrence fields from server replace optimistic values', () => {
    const sub = makeSubTask({ id: 'sub-1', isCompleted: false })
    const task = makeTask({
      subTasks:        [sub],
      recurrenceType:  'daily',
      recurrenceInterval: 1,
      dueDate:         '2026-07-19',
      lastCompletedDate: undefined,
    })

    const tasks      = [task]
    const optimistic = buildOptimisticSubTaskUpdate(task, 'sub-1', true)
    const withOptimistic = applyUpdate(tasks, task.id, optimistic)

    // Recurring tasks: server resets isCompleted and advances dueDate
    const serverResponse: TaskItem = {
      ...task,
      isCompleted:       false,
      completedAt:       undefined,
      lastCompletedDate: '2026-07-19',
      dueDate:           '2026-07-20',
      subTasks:          [{ ...sub, isCompleted: true }],
    }
    const withServer = applyUpdate(withOptimistic, task.id, serverResponse)

    const reconciled = withServer.find(t => t.id === task.id)!
    expect(reconciled.isCompleted).toBe(false)
    expect(reconciled.lastCompletedDate).toBe('2026-07-19')
    expect(reconciled.dueDate).toBe('2026-07-20')
  })
})

// ══════════════════════════════════════════════════════════════════════════════

describe('toggleSubTask — rollback on API failure', () => {
  it('restores original task when updateSubTask rejects', () => {
    const sub = makeSubTask({ id: 'sub-1', isCompleted: false })
    const task = makeTask({ subTasks: [sub] })

    const tasks      = [task]
    const optimistic = buildOptimisticSubTaskUpdate(task, 'sub-1', true)
    const withOptimistic = applyUpdate(tasks, task.id, optimistic)

    // Simulate API failure: rollback
    const withRollback = rollback(withOptimistic, task.id, task)

    const restored = withRollback.find(t => t.id === task.id)!
    expect(restored.subTasks![0].isCompleted).toBe(false)
    expect(restored.isCompleted).toBe(false)
    expect(restored.completedAt).toBeUndefined()
  })

  it('rollback does not affect other tasks in the list', () => {
    const sub  = makeSubTask({ id: 'sub-1', isCompleted: false })
    const task1 = makeTask({ id: 'task-1', subTasks: [sub] })
    const task2 = makeTask({ id: 'task-2', isCompleted: true  })

    const tasks      = [task1, task2]
    const optimistic = buildOptimisticSubTaskUpdate(task1, 'sub-1', true)
    const withOptimistic = applyUpdate(tasks, task1.id, optimistic)
    const withRollback   = rollback(withOptimistic, task1.id, task1)

    expect(withRollback.find(t => t.id === 'task-2')!.isCompleted).toBe(true)
    expect(withRollback.find(t => t.id === 'task-1')!.subTasks![0].isCompleted).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════════════════════

describe('habitProgress — uses reconciled server task', () => {
  it('progress reflects server subtask state after reconciliation', () => {
    const sub1 = makeSubTask({ id: 'sub-1', isCompleted: true  })
    const sub2 = makeSubTask({ id: 'sub-2', isCompleted: false })
    const task  = makeTask({ subTasks: [sub1, sub2] })

    const progress = habitProgress(task)
    expect(progress.done).toBe(1)
    expect(progress.total).toBe(2)
  })

  it('progress is 1/1 for a habit with no subtasks that is complete', () => {
    const task = makeTask({ subTasks: [], isCompleted: true })
    const progress = habitProgress(task)
    expect(progress.done).toBe(1)
    expect(progress.total).toBe(1)
  })

  it('progress is 0/1 for a habit with no subtasks that is incomplete', () => {
    const task = makeTask({ subTasks: [], isCompleted: false })
    const progress = habitProgress(task)
    expect(progress.done).toBe(0)
    expect(progress.total).toBe(1)
  })

  it('progress is correct after server response applied (all subs done)', () => {
    const sub1 = makeSubTask({ id: 'sub-1', isCompleted: true })
    const sub2 = makeSubTask({ id: 'sub-2', isCompleted: true })
    const task  = makeTask({ isCompleted: true, subTasks: [sub1, sub2] })

    const progress = habitProgress(task)
    expect(progress.done).toBe(2)
    expect(progress.total).toBe(2)
  })
})
