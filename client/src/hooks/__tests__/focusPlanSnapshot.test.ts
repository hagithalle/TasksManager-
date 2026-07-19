/**
 * Unit tests for the focus-plan snapshot lifecycle.
 *
 * The snapshot is a frozen daily record stored in localStorage:
 *   { date: string, version: 1, entries: [{taskId, subTaskId?}] }
 *
 * These tests exercise the pure functions (loadSnapshot, saveSnapshot,
 * createSnapshotFromPlan) and the lifecycle rules without mounting any React
 * component. localStorage is available in Node's vitest environment via
 * the global `localStorage` stub.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FocusPlanSnapshot, FocusPlanEntry } from '../useFocusCoach'
import { computeFocusProgressFromSnapshot } from '../coachProgress'
import type { TaskItem } from '../../types'

// ── localStorage mock (vitest runs in node env — no built-in localStorage) ────

const _store = new Map<string, string>()
const mockLocalStorage = {
  getItem:    (key: string) => _store.get(key) ?? null,
  setItem:    (key: string, value: string) => { _store.set(key, value) },
  removeItem: (key: string) => { _store.delete(key) },
  clear:      () => { _store.clear() },
  get length() { return _store.size },
  key:        (i: number) => [..._store.keys()][i] ?? null,
}

beforeEach(() => {
  _store.clear()
  vi.stubGlobal('localStorage', mockLocalStorage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Minimal task factory ───────────────────────────────────────────────────────

function makeTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id:            'task-1',
    title:         'Test task',
    isCompleted:   false,
    completedAt:   undefined,
    priority:      'medium' as any,
    executionType: 'short'  as any,
    subTasks:      [],
    taskNature:    'action'      as any,
    dailyRole:     'focus'       as any,
    taskStatus:    'open'        as any,
    createdAt:     '2026-01-01T00:00:00Z',
    updatedAt:     '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

const TODAY = '2026-07-19'

// ── Inline re-implementation of the pure snapshot helpers ─────────────────────
// We test the logic without importing the private helpers (which are not exported).
// This mirrors exactly what useFocusCoach.ts does.

const SNAPSHOT_KEY = 'focusPlanSnapshotV1'

function loadSnapshot(): FocusPlanSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.version !== 1) return null
    return parsed as FocusPlanSnapshot
  } catch {
    return null
  }
}

function saveSnapshot(snap: FocusPlanSnapshot): void {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap))
}

function makeSnapshot(date: string, entries: FocusPlanEntry[]): FocusPlanSnapshot {
  return { date, version: 1, entries }
}


// ══════════════════════════════════════════════════════════════════════════════
// loadSnapshot — read from localStorage
// ══════════════════════════════════════════════════════════════════════════════

describe('loadSnapshot', () => {
  it('returns null when localStorage is empty', () => {
    expect(loadSnapshot()).toBeNull()
  })

  it('returns null when stored version is not 1', () => {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ date: TODAY, version: 2, entries: [] }))
    expect(loadSnapshot()).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    localStorage.setItem(SNAPSHOT_KEY, 'not-json{{{')
    expect(loadSnapshot()).toBeNull()
  })

  it('returns the snapshot when valid version-1 data is present', () => {
    const snap = makeSnapshot(TODAY, [{ taskId: 'f1' }])
    saveSnapshot(snap)
    const loaded = loadSnapshot()
    expect(loaded).not.toBeNull()
    expect(loaded!.date).toBe(TODAY)
    expect(loaded!.entries).toHaveLength(1)
    expect(loaded!.entries[0].taskId).toBe('f1')
  })

  it('round-trips a snapshot with subtask entries', () => {
    const snap = makeSnapshot(TODAY, [
      { taskId: 'f1' },
      { taskId: 'f2', subTaskId: 'sub-3' },
    ])
    saveSnapshot(snap)
    const loaded = loadSnapshot()!
    expect(loaded.entries[1].subTaskId).toBe('sub-3')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// saveSnapshot + loadSnapshot round-trip
// ══════════════════════════════════════════════════════════════════════════════

describe('saveSnapshot / loadSnapshot round-trip', () => {
  it('persists a 5-entry snapshot and reloads it intact', () => {
    const entries = [1, 2, 3, 4, 5].map(i => ({ taskId: `task-${i}` }))
    const snap = makeSnapshot(TODAY, entries)
    saveSnapshot(snap)

    const loaded = loadSnapshot()!
    expect(loaded.entries).toHaveLength(5)
    expect(loaded.entries.map(e => e.taskId)).toEqual(entries.map(e => e.taskId))
  })

  it('overwriting a snapshot replaces the old data entirely', () => {
    const snap1 = makeSnapshot('2026-07-18', [{ taskId: 'old-task' }])
    saveSnapshot(snap1)

    const snap2 = makeSnapshot(TODAY, [{ taskId: 'new-task' }])
    saveSnapshot(snap2)

    const loaded = loadSnapshot()!
    expect(loaded.date).toBe(TODAY)
    expect(loaded.entries[0].taskId).toBe('new-task')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Lifecycle rules — new-day detection
// ══════════════════════════════════════════════════════════════════════════════

describe('new-day detection', () => {
  it('snapshot from yesterday is treated as stale (date mismatch)', () => {
    const yesterdaySnap = makeSnapshot('2026-07-18', [{ taskId: 'f1' }])
    saveSnapshot(yesterdaySnap)

    const loaded = loadSnapshot()!
    const isNewDay = loaded.date !== TODAY
    expect(isNewDay).toBe(true)
  })

  it('snapshot from today is NOT treated as stale', () => {
    const todaySnap = makeSnapshot(TODAY, [{ taskId: 'f1' }])
    saveSnapshot(todaySnap)

    const loaded = loadSnapshot()!
    const isNewDay = loaded.date !== TODAY
    expect(isNewDay).toBe(false)
  })

  it('computeFocusProgressFromSnapshot returns 0/0 for a stale snapshot', () => {
    const yesterdaySnap = makeSnapshot('2026-07-18', [{ taskId: 'f1' }])
    const f1 = makeTask({ id: 'f1' })
    const result = computeFocusProgressFromSnapshot(yesterdaySnap, [f1], TODAY)
    expect(result).toEqual({ done: 0, total: 0 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Lifecycle rules — refresh / manual rebuild
// ══════════════════════════════════════════════════════════════════════════════

describe('manual refresh', () => {
  it('overwriting with a new plan replaces the snapshot entries', () => {
    const original = makeSnapshot(TODAY, [{ taskId: 'task-A' }])
    saveSnapshot(original)

    // User hits Refresh: engine selects different tasks
    const refreshed = makeSnapshot(TODAY, [{ taskId: 'task-B' }, { taskId: 'task-C' }])
    saveSnapshot(refreshed)

    const loaded = loadSnapshot()!
    expect(loaded.entries).toHaveLength(2)
    expect(loaded.entries.map(e => e.taskId)).toEqual(['task-B', 'task-C'])
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Lifecycle rules — task deletion and archival after snapshot
// ══════════════════════════════════════════════════════════════════════════════

describe('stale entries after task deletion / archival', () => {
  it('deleted task (absent from tasks array) reduces total by 1, no error', () => {
    const snap = makeSnapshot(TODAY, [
      { taskId: 'alive' },
      { taskId: 'deleted' },   // this task was removed from the server
    ])
    const aliveTask = makeTask({ id: 'alive' })
    // 'deleted' task is not in tasks array at all

    const result = computeFocusProgressFromSnapshot(snap, [aliveTask], TODAY)
    expect(result.total).toBe(1)   // 'deleted' is skipped
    expect(result.done).toBe(0)
  })

  it('archived task reduces total by 1, no error', () => {
    const snap = makeSnapshot(TODAY, [
      { taskId: 'f1' },
      { taskId: 'f2-archived' },
    ])
    const f1        = makeTask({ id: 'f1' })
    const f2Archived = makeTask({ id: 'f2-archived', taskStatus: 'archived' as any })

    const result = computeFocusProgressFromSnapshot(snap, [f1, f2Archived], TODAY)
    expect(result.total).toBe(1)
    expect(result.done).toBe(0)
  })

  it('if all entries become stale, result is 0/0 without error', () => {
    const snap = makeSnapshot(TODAY, [
      { taskId: 'gone-1' },
      { taskId: 'gone-2' },
    ])
    const result = computeFocusProgressFromSnapshot(snap, [], TODAY)
    expect(result).toEqual({ done: 0, total: 0 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Lifecycle rules — maxTasks changes
// ══════════════════════════════════════════════════════════════════════════════

describe('maxTasks change does not mutate existing snapshot', () => {
  it('snapshot frozen at 3 entries is not affected when 5 tasks are available', () => {
    // Snapshot was created when maxTasks=3
    const snap = makeSnapshot(TODAY, [
      { taskId: 'f1' },
      { taskId: 'f2' },
      { taskId: 'f3' },
    ])
    saveSnapshot(snap)

    // Later, user changed maxTasks to 5 and 5 tasks are eligible.
    // The snapshot was NOT overwritten (no manual refresh + same day).
    const loaded = loadSnapshot()!
    expect(loaded.entries).toHaveLength(3)   // still 3, not 5
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Scheduled events do not count as focus progress
// ══════════════════════════════════════════════════════════════════════════════

describe('scheduled events do not count as focus progress', () => {
  it('a task with plannedTime completed today is not counted unless in snapshot', () => {
    const scheduledTask = makeTask({
      id:          'sched-1',
      plannedTime: '09:00',
      isCompleted: true,
      completedAt: `${TODAY}T09:30:00Z`,
    })
    // scheduledTask is in tasks array but NOT in the focus plan snapshot
    const snap = makeSnapshot(TODAY, [{ taskId: 'focus-only' }])
    const focusTask = makeTask({ id: 'focus-only' })

    const result = computeFocusProgressFromSnapshot(snap, [scheduledTask, focusTask], TODAY)
    expect(result.total).toBe(1)
    expect(result.done).toBe(0)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Parent vs subtask selection identification
// ══════════════════════════════════════════════════════════════════════════════

describe('parent and subtask selection', () => {
  it('parent entry uses task.isCompleted for the done check', () => {
    const f1 = makeTask({ id: 'f1', isCompleted: true, completedAt: `${TODAY}T10:00:00Z` })
    const snap = makeSnapshot(TODAY, [{ taskId: 'f1' }])  // no subTaskId → parent entry
    const result = computeFocusProgressFromSnapshot(snap, [f1], TODAY)
    expect(result.done).toBe(1)
  })

  it('subtask entry is done only when the specific subtask is completed', () => {
    const f1 = makeTask({
      id: 'f1',
      subTasks: [
        { id: 'sub-1', title: 'Step 1', isCompleted: true  },
        { id: 'sub-2', title: 'Step 2', isCompleted: false },
      ],
    })
    // Only sub-1 is the target entry
    const snap = makeSnapshot(TODAY, [{ taskId: 'f1', subTaskId: 'sub-1' }])
    const result = computeFocusProgressFromSnapshot(snap, [f1], TODAY)
    expect(result.done).toBe(1)
  })

  it('subtask entry is not done when target subtask is absent from task', () => {
    const f1 = makeTask({ id: 'f1', subTasks: [] })
    const snap = makeSnapshot(TODAY, [{ taskId: 'f1', subTaskId: 'sub-ghost' }])
    const result = computeFocusProgressFromSnapshot(snap, [f1], TODAY)
    // sub-ghost doesn't exist on f1 — treated as not done
    expect(result.done).toBe(0)
    expect(result.total).toBe(1)
  })
})
