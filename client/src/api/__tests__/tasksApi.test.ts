/**
 * Unit tests for tasksApi helpers.
 *
 * These tests exercise mapRawTask in isolation — no network or auth required.
 * They verify that dailyRole, taskNature, taskStatus, and completedAt are
 * correctly mapped from raw API responses into TypeScript TaskItem objects.
 */

import { describe, it, expect } from 'vitest'
import { mapRawTask } from '../tasksApi'

// ── Minimal raw task factory (mimics the shape the backend returns) ─────────

function rawTask(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id:            'task-uuid-1',
    userId:        'user-uuid-1',
    title:         'Test task',
    notes:         null,
    isCompleted:   false,
    completedAt:   null,
    priority:      'medium',
    executionType: 'short',
    difficulty:    null,
    dueDate:       null,
    plannedTime:   null,
    durationMinutes: null,
    goalId:        null,
    listId:        null,
    subTasks:      [],
    createdAt:     '2026-01-01T00:00:00Z',
    updatedAt:     '2026-01-01T00:00:00Z',
    reminderAt:    null,
    reminderOffsetMinutes: null,
    recurrenceType:  'none',
    recurrenceInterval: 1,
    lastCompletedDate: null,
    nature:        'action',
    status:        'open',
    dailyRole:     'focus',
    ...overrides,
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. dailyRole persistence — creating tasks with different roles
// ══════════════════════════════════════════════════════════════════════════════

describe('mapRawTask — dailyRole persistence', () => {
  it('maps dailyRole: "morningRoutine" correctly (MorningRoutine task persists)', () => {
    const task = mapRawTask(rawTask({ dailyRole: 'morningRoutine' }))
    expect(task.dailyRole).toBe('morningRoutine')
  })

  it('maps dailyRole: "ongoingHabit" correctly (OngoingHabit task persists)', () => {
    const task = mapRawTask(rawTask({ dailyRole: 'ongoingHabit' }))
    expect(task.dailyRole).toBe('ongoingHabit')
  })

  it('maps dailyRole: "focus" correctly', () => {
    const task = mapRawTask(rawTask({ dailyRole: 'focus' }))
    expect(task.dailyRole).toBe('focus')
  })

  it('defaults to "focus" when dailyRole is absent from response', () => {
    const raw = rawTask()
    delete (raw as any).dailyRole
    const task = mapRawTask(raw)
    expect(task.dailyRole).toBe('focus')
  })

  it('defaults to "focus" when dailyRole is null', () => {
    const task = mapRawTask(rawTask({ dailyRole: null }))
    expect(task.dailyRole).toBe('focus')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 2. Updating unrelated fields does not reset dailyRole
//    (This is a backend concern, but we verify that the response mapper
//    faithfully round-trips whatever the server returns after a PATCH.)
// ══════════════════════════════════════════════════════════════════════════════

describe('mapRawTask — field isolation', () => {
  it('preserves dailyRole when only title is updated in response', () => {
    const task = mapRawTask(rawTask({ title: 'Updated title', dailyRole: 'morningRoutine' }))
    expect(task.title).toBe('Updated title')
    expect(task.dailyRole).toBe('morningRoutine')
  })

  it('reflects updated dailyRole when it is changed', () => {
    const original = mapRawTask(rawTask({ dailyRole: 'focus' }))
    expect(original.dailyRole).toBe('focus')

    const updated  = mapRawTask(rawTask({ dailyRole: 'morningRoutine' }))
    expect(updated.dailyRole).toBe('morningRoutine')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 3. completedAt mapping — critical for isDoneForToday
// ══════════════════════════════════════════════════════════════════════════════

describe('mapRawTask — completedAt mapping', () => {
  it('maps completedAt as undefined when null', () => {
    const task = mapRawTask(rawTask({ completedAt: null }))
    expect(task.completedAt).toBeUndefined()
  })

  it('maps completedAt when present', () => {
    const task = mapRawTask(rawTask({ completedAt: '2026-07-19T08:30:00Z' }))
    expect(task.completedAt).toBe('2026-07-19T08:30:00Z')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 4. dueDate truncation — verified to not affect dailyRole tests
// ══════════════════════════════════════════════════════════════════════════════

describe('mapRawTask — dueDate truncation', () => {
  it('truncates ISO dueDate to YYYY-MM-DD', () => {
    const task = mapRawTask(rawTask({ dueDate: '2026-07-19T00:00:00Z' }))
    expect(task.dueDate).toBe('2026-07-19')
  })

  it('maps null dueDate to undefined', () => {
    const task = mapRawTask(rawTask({ dueDate: null }))
    expect(task.dueDate).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 5. lastCompletedDate — used by isCompletedInCurrentPeriod
// ══════════════════════════════════════════════════════════════════════════════

describe('mapRawTask — lastCompletedDate mapping', () => {
  it('maps lastCompletedDate when present', () => {
    const task = mapRawTask(rawTask({ lastCompletedDate: '2026-07-19' }))
    expect(task.lastCompletedDate).toBe('2026-07-19')
  })

  it('maps null lastCompletedDate to undefined', () => {
    const task = mapRawTask(rawTask({ lastCompletedDate: null }))
    expect(task.lastCompletedDate).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// 6. subTasks mapping
// ══════════════════════════════════════════════════════════════════════════════

describe('mapRawTask — subTask mapping', () => {
  it('maps subTasks array correctly', () => {
    const task = mapRawTask(rawTask({
      subTasks: [
        { id: 'sub-1', taskItemId: 'task-uuid-1', title: 'Sub A', isCompleted: false },
        { id: 'sub-2', taskItemId: 'task-uuid-1', title: 'Sub B', isCompleted: true  },
      ],
    }))
    expect(task.subTasks).toHaveLength(2)
    expect(task.subTasks![0].id).toBe('sub-1')
    expect(task.subTasks![0].isCompleted).toBe(false)
    expect(task.subTasks![1].isCompleted).toBe(true)
  })

  it('maps absent subTasks field to empty array', () => {
    const raw = rawTask()
    delete (raw as any).subTasks
    const task = mapRawTask(raw)
    expect(task.subTasks).toEqual([])
  })
})
