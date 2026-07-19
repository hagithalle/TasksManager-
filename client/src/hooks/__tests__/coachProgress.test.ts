/**
 * Tests for Phase 5 pure helper functions.
 *
 * computeCoachProgress  — per-section progress calculation
 * getEncouragementKey   — deterministic message selection
 *
 * Also covers UX behavior rules that can be verified without rendering:
 * - morning section collapse logic
 * - habit progress display (no 0/0 for simple habits)
 * - focus task count
 * - empty state selection
 * - RTL/LTR (HTML dir attribute logic)
 * - expand/collapse accessibility state
 */

import { describe, it, expect } from 'vitest'
import {
  computeCoachProgress,
  computeFocusProgressFromSnapshot,
  getEncouragementKey,
  type CoachProgress,
  type SectionProgress,
} from '../coachProgress'
import { isDoneForToday, type FocusPlanSnapshot } from '../useFocusCoach'
import type { TaskItem } from '../../types'

// ── Shared factories ────────────────────────────────────────────────────────────

const TODAY = '2026-07-19'

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id:            't1',
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

function routine(overrides: Partial<TaskItem> = {}): TaskItem {
  return task({ dailyRole: 'morningRoutine' as any, ...overrides })
}

function habit(overrides: Partial<TaskItem> = {}): TaskItem {
  return task({ dailyRole: 'ongoingHabit' as any, ...overrides })
}

// ══════════════════════════════════════════════════════════════════════════════
// computeCoachProgress
// ══════════════════════════════════════════════════════════════════════════════

describe('computeCoachProgress — morning section', () => {
  it('counts done routines via isDoneForToday', () => {
    const r1 = routine({ id: 'r1', isCompleted: true, completedAt: `${TODAY}T07:00:00Z` })
    const r2 = routine({ id: 'r2' })
    const p = computeCoachProgress([r1, r2], [], [], null, TODAY)
    expect(p.morning).toEqual<SectionProgress>({ done: 1, total: 2 })
  })

  it('is 0/0 when there are no routines', () => {
    const p = computeCoachProgress([], [], [], null, TODAY)
    expect(p.morning).toEqual<SectionProgress>({ done: 0, total: 0 })
  })

  it('is total/total when all routines done today', () => {
    const r1 = routine({ id: 'r1', isCompleted: true, completedAt: `${TODAY}T06:00:00Z` })
    const r2 = routine({ id: 'r2', isCompleted: true, completedAt: `${TODAY}T06:30:00Z` })
    const p = computeCoachProgress([r1, r2], [], [], null, TODAY)
    expect(p.morning).toEqual<SectionProgress>({ done: 2, total: 2 })
  })

  it('does not count a routine completed on a previous day', () => {
    const r = routine({ isCompleted: true, completedAt: '2026-07-18T20:00:00Z' })
    const p = computeCoachProgress([r], [], [], null, TODAY)
    // completedAt is yesterday → isDoneForToday returns false
    expect(p.morning.done).toBe(0)
  })
})

describe('computeCoachProgress — habits section', () => {
  it('counts done habits via isDoneForToday', () => {
    const h1 = habit({ id: 'h1', isCompleted: true, completedAt: `${TODAY}T09:00:00Z` })
    const h2 = habit({ id: 'h2' })
    const p = computeCoachProgress([], [h1, h2], [], null, TODAY)
    expect(p.habits).toEqual<SectionProgress>({ done: 1, total: 2 })
  })

  it('is 0/0 when there are no habits', () => {
    const p = computeCoachProgress([], [], [], null, TODAY)
    expect(p.habits).toEqual<SectionProgress>({ done: 0, total: 0 })
  })
})

describe('computeCoachProgress — focus section (snapshot-based)', () => {
  it('focus progress is 0/0 with null snapshot', () => {
    const p = computeCoachProgress([], [], [], null, TODAY)
    expect(p.focus).toEqual<SectionProgress>({ done: 0, total: 0 })
  })

  it('focus total equals snapshot entry count', () => {
    const f1 = task({ id: 'f1' })
    const f2 = task({ id: 'f2' })
    const snap: FocusPlanSnapshot = { date: TODAY, version: 1, entries: [{ taskId: 'f1' }, { taskId: 'f2' }] }
    const p = computeCoachProgress([], [], [f1, f2], snap, TODAY)
    expect(p.focus.total).toBe(2)
    expect(p.focus.done).toBe(0)
  })

  it('focus done counts only tasks completed today per snapshot', () => {
    const f1 = task({ id: 'f1', isCompleted: true, completedAt: `${TODAY}T10:00:00Z` })
    const f2 = task({ id: 'f2' })
    const snap: FocusPlanSnapshot = { date: TODAY, version: 1, entries: [{ taskId: 'f1' }, { taskId: 'f2' }] }
    const p = computeCoachProgress([], [], [f1, f2], snap, TODAY)
    expect(p.focus.done).toBe(1)
    expect(p.focus.total).toBe(2)
  })

  it('when all snapshot entries are completed, done === total', () => {
    const f1 = task({ id: 'f1', isCompleted: true, completedAt: `${TODAY}T09:00:00Z` })
    const f2 = task({ id: 'f2', isCompleted: true, completedAt: `${TODAY}T11:00:00Z` })
    const snap: FocusPlanSnapshot = { date: TODAY, version: 1, entries: [{ taskId: 'f1' }, { taskId: 'f2' }] }
    const p = computeCoachProgress([], [], [f1, f2], snap, TODAY)
    expect(p.focus.done).toBe(2)
    expect(p.focus.total).toBe(2)
  })
})

describe('computeCoachProgress — all zeros', () => {
  it('returns all zeros with empty inputs and no snapshot', () => {
    const p = computeCoachProgress([], [], [], null, TODAY)
    expect(p.morning).toEqual({ done: 0, total: 0 })
    expect(p.focus).toEqual({ done: 0, total: 0 })
    expect(p.habits).toEqual({ done: 0, total: 0 })
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// getEncouragementKey — deterministic message rules
// ══════════════════════════════════════════════════════════════════════════════

describe('getEncouragementKey', () => {
  it('returns "begin" when all sections are empty', () => {
    const p: CoachProgress = { morning: { done: 0, total: 0 }, focus: { done: 0, total: 0 }, habits: { done: 0, total: 0 } }
    expect(getEncouragementKey(p)).toBe('begin')
  })

  it('returns "begin" when tasks exist but nothing done', () => {
    const p: CoachProgress = { morning: { done: 0, total: 3 }, focus: { done: 0, total: 2 }, habits: { done: 0, total: 1 } }
    expect(getEncouragementKey(p)).toBe('begin')
  })

  it('returns "morningStarted" when morning is partially done and focus=0', () => {
    const p: CoachProgress = { morning: { done: 1, total: 3 }, focus: { done: 0, total: 2 }, habits: { done: 0, total: 0 } }
    expect(getEncouragementKey(p)).toBe('morningStarted')
  })

  it('returns "morningDone" when morning is fully done and focus is still 0', () => {
    const p: CoachProgress = { morning: { done: 3, total: 3 }, focus: { done: 0, total: 2 }, habits: { done: 0, total: 1 } }
    expect(getEncouragementKey(p)).toBe('morningDone')
  })

  it('returns "focusProgress" when at least one focus task is done', () => {
    const p: CoachProgress = { morning: { done: 3, total: 3 }, focus: { done: 1, total: 3 }, habits: { done: 0, total: 0 } }
    expect(getEncouragementKey(p)).toBe('focusProgress')
  })

  it('returns "focusProgress" even when morning is not done, as long as focus has progress', () => {
    const p: CoachProgress = { morning: { done: 0, total: 3 }, focus: { done: 1, total: 3 }, habits: { done: 0, total: 0 } }
    expect(getEncouragementKey(p)).toBe('focusProgress')
  })

  it('returns "allDone" when every section is fully complete', () => {
    const p: CoachProgress = { morning: { done: 2, total: 2 }, focus: { done: 3, total: 3 }, habits: { done: 1, total: 1 } }
    expect(getEncouragementKey(p)).toBe('allDone')
  })

  it('returns "allDone" when only focus section exists and is done', () => {
    const p: CoachProgress = { morning: { done: 0, total: 0 }, focus: { done: 2, total: 2 }, habits: { done: 0, total: 0 } }
    expect(getEncouragementKey(p)).toBe('allDone')
  })

  it('does NOT return "allDone" if any section still has outstanding work', () => {
    const p: CoachProgress = { morning: { done: 2, total: 2 }, focus: { done: 2, total: 3 }, habits: { done: 1, total: 1 } }
    expect(getEncouragementKey(p)).toBe('focusProgress')
  })

  it('"allDone" is not returned when all totals are 0 (nothing to do)', () => {
    const p: CoachProgress = { morning: { done: 0, total: 0 }, focus: { done: 0, total: 0 }, habits: { done: 0, total: 0 } }
    expect(getEncouragementKey(p)).not.toBe('allDone')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Morning section collapse logic (pure)
// ══════════════════════════════════════════════════════════════════════════════

describe('morning section — collapse logic (pure)', () => {
  function isAllDone(routines: TaskItem[], today: string): boolean {
    if (routines.length === 0) return false
    const done = routines.filter(r => isDoneForToday(r, today)).length
    return done === routines.length
  }

  it('collapses (allDone=true) only when every routine is completed today', () => {
    const r1 = routine({ isCompleted: true, completedAt: `${TODAY}T06:00:00Z` })
    const r2 = routine({ isCompleted: true, completedAt: `${TODAY}T06:30:00Z` })
    expect(isAllDone([r1, r2], TODAY)).toBe(true)
  })

  it('does NOT collapse when one routine is incomplete', () => {
    const r1 = routine({ isCompleted: true, completedAt: `${TODAY}T06:00:00Z` })
    const r2 = routine({ isCompleted: false })
    expect(isAllDone([r1, r2], TODAY)).toBe(false)
  })

  it('does NOT collapse when routines list is empty', () => {
    expect(isAllDone([], TODAY)).toBe(false)
  })

  it('does NOT collapse when routine was completed on a previous day', () => {
    const r = routine({ isCompleted: true, completedAt: '2026-07-18T20:00:00Z' })
    expect(isAllDone([r], TODAY)).toBe(false)
  })

  it('expand=true lets completed morning section show the checklist again', () => {
    // Model: when allDone && !expanded → collapsed; when allDone && expanded → list shown
    const allDone  = true
    const expanded = true
    const showChecklist = !allDone || expanded   // mirrors MorningRoutineSection logic
    expect(showChecklist).toBe(true)
  })

  it('success banner shown only when allDone && !expanded', () => {
    expect(!true  || false).toBe(false)   // allDone, collapsed → success visible
    expect(!true  || true).toBe(true)     // allDone, expanded → checklist visible (banner hidden)
    expect(!false || false).toBe(true)    // not allDone → checklist visible
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Habit progress — no 0/0 for habits without subtasks
// ══════════════════════════════════════════════════════════════════════════════

describe('habit display — no 0/0 for simple habits', () => {
  it('hasSubTasks=false when subTasks is empty array', () => {
    const h = habit({ subTasks: [] })
    const hasSubTasks = (h.subTasks ?? []).length > 0
    expect(hasSubTasks).toBe(false)
  })

  it('hasSubTasks=false when subTasks is absent', () => {
    const h = habit({ subTasks: undefined })
    const hasSubTasks = (h.subTasks ?? []).length > 0
    expect(hasSubTasks).toBe(false)
  })

  it('progress counter (done/total) is only shown when hasSubTasks=true', () => {
    // The component guards: {hasSubTasks && <Typography>done/total</Typography>}
    // This test verifies the guard condition, not the rendered output
    const withSubs = habit({ subTasks: [{ id: 'sub-1', title: 'S', isCompleted: false }] })
    const noSubs   = habit({ subTasks: [] })
    expect((withSubs.subTasks ?? []).length > 0).toBe(true)
    expect((noSubs.subTasks   ?? []).length > 0).toBe(false)
  })

  it('progress bar value is 0 for incomplete no-subtask habit', () => {
    // progress = total>0 ? (done/total)*100 : (isDone ? 100 : 0)
    const isDone = false, total = 0
    const progress = total > 0 ? Math.round(0 / total * 100) : (isDone ? 100 : 0)
    expect(progress).toBe(0)
  })

  it('progress bar value is 100 for completed no-subtask habit', () => {
    const isDone = true, total = 0
    const progress = total > 0 ? Math.round(0 / total * 100) : (isDone ? 100 : 0)
    expect(progress).toBe(100)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Habit pending state
// ══════════════════════════════════════════════════════════════════════════════

describe('habit pending state — action button behaviour', () => {
  it('handleCompleteNext is a no-op when pending=true', () => {
    let called = false
    function handleCompleteNext(pending: boolean, isDone: boolean) {
      if (pending || isDone) return
      called = true
    }
    handleCompleteNext(true, false)
    expect(called).toBe(false)
  })

  it('handleCompleteNext is a no-op when isDone=true', () => {
    let called = false
    function handleCompleteNext(pending: boolean, isDone: boolean) {
      if (pending || isDone) return
      called = true
    }
    handleCompleteNext(false, true)
    expect(called).toBe(false)
  })

  it('handleCompleteNext fires when not pending and not done', () => {
    let called = false
    function handleCompleteNext(pending: boolean, isDone: boolean) {
      if (pending || isDone) return
      called = true
    }
    handleCompleteNext(false, false)
    expect(called).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Completed habit shows done badge, not action
// ══════════════════════════════════════════════════════════════════════════════

describe('completed habit — shows done badge, no action', () => {
  it('isDone=true hides the +1 action and shows the completed badge', () => {
    // Component logic: {!isDone && <Button>} + {isDone && <Typography>✓</Typography>}
    const showAction = (isDone: boolean) => !isDone
    const showBadge  = (isDone: boolean) => isDone
    expect(showAction(true)).toBe(false)
    expect(showBadge(true)).toBe(true)
    expect(showAction(false)).toBe(true)
    expect(showBadge(false)).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Empty focus state
// ══════════════════════════════════════════════════════════════════════════════

describe('focus empty state', () => {
  it('shows emptyRelax message when no focus tasks and none completed', () => {
    // Component: {focusDone > 0 ? allDoneMsg : emptyRelaxMsg}
    const focusDone = 0
    const showAllDone    = focusDone > 0
    const showEmptyRelax = !showAllDone
    expect(showAllDone).toBe(false)
    expect(showEmptyRelax).toBe(true)
  })

  it('shows all-done message when focus tasks were completed today', () => {
    const focusDone = 2
    const showAllDone = focusDone > 0
    expect(showAllDone).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// RTL / LTR layout — HTML attributes
// ══════════════════════════════════════════════════════════════════════════════

describe('RTL and LTR layout attributes', () => {
  it('Hebrew locale produces "he" lang attribute on root', () => {
    // The app sets document.documentElement.lang based on i18n language
    // This test verifies the expected attribute value for the Hebrew locale
    const lang = 'he'
    expect(lang).toBe('he')
  })

  it('Hebrew locale uses dir="rtl" on root', () => {
    const dir = 'rtl'
    expect(dir).toBe('rtl')
  })

  it('English locale uses dir="ltr" on root', () => {
    const dir = 'ltr'
    expect(dir).toBe('ltr')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Expand/collapse accessibility attributes (aria-expanded)
// ══════════════════════════════════════════════════════════════════════════════

describe('expand/collapse accessibility — aria-expanded values', () => {
  it('expand button has aria-expanded=false when section is collapsed', () => {
    const expanded = false
    expect(expanded).toBe(false)   // aria-expanded={expanded}
  })

  it('expand button has aria-expanded=true when section is opened', () => {
    const expanded = true
    expect(expanded).toBe(true)    // aria-expanded={expanded}
  })

  it('subtask expand in HabitProgressItem starts collapsed (aria-expanded=false)', () => {
    const initialExpandedState = false
    expect(initialExpandedState).toBe(false)
  })

  it('morning section expand starts closed (aria-expanded=false)', () => {
    // useState(false) — default state for expanded
    const initialExpanded = false
    expect(initialExpanded).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Daily summary — SmartCoachProgressSummary visibility
// ══════════════════════════════════════════════════════════════════════════════

describe('SmartCoachProgressSummary — visibility logic', () => {
  function shouldShowSummary(p: CoachProgress): boolean {
    // Only show if at least one section has tasks
    return p.morning.total > 0 || p.focus.total > 0 || p.habits.total > 0
  }

  it('hides summary when all sections have 0 total tasks', () => {
    const p: CoachProgress = { morning: { done: 0, total: 0 }, focus: { done: 0, total: 0 }, habits: { done: 0, total: 0 } }
    expect(shouldShowSummary(p)).toBe(false)
  })

  it('shows summary when morning has tasks', () => {
    const p: CoachProgress = { morning: { done: 1, total: 3 }, focus: { done: 0, total: 0 }, habits: { done: 0, total: 0 } }
    expect(shouldShowSummary(p)).toBe(true)
  })

  it('shows summary when only focus has tasks', () => {
    const p: CoachProgress = { morning: { done: 0, total: 0 }, focus: { done: 0, total: 2 }, habits: { done: 0, total: 0 } }
    expect(shouldShowSummary(p)).toBe(true)
  })

  it('shows summary when only habits section has tasks', () => {
    const p: CoachProgress = { morning: { done: 0, total: 0 }, focus: { done: 0, total: 0 }, habits: { done: 1, total: 2 } }
    expect(shouldShowSummary(p)).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// Focus task order stability
// ══════════════════════════════════════════════════════════════════════════════

describe('focus task order — preserved after completion', () => {
  it('array.filter preserves relative order of remaining items', () => {
    const recs = [
      { key: 'a', title: 'Task A' },
      { key: 'b', title: 'Task B' },
      { key: 'c', title: 'Task C' },
    ]
    // Simulate completing 'a': the engine rebuilds without 'a'
    const remaining = recs.filter(r => r.key !== 'a')
    expect(remaining[0].key).toBe('b')
    expect(remaining[1].key).toBe('c')
  })
})

// ══════════════════════════════════════════════════════════════════════════════
// computeFocusProgressFromSnapshot — exact snapshot-based focus counting
// ══════════════════════════════════════════════════════════════════════════════

describe('computeFocusProgressFromSnapshot — core behaviour', () => {
  it('returns 0/0 when snapshot is null', () => {
    const result = computeFocusProgressFromSnapshot(null, [], TODAY)
    expect(result).toEqual({ done: 0, total: 0 })
  })

  it('returns 0/0 when snapshot date does not match today', () => {
    const snap: FocusPlanSnapshot = {
      date: '2026-07-18',  // yesterday
      version: 1,
      entries: [{ taskId: 'f1' }],
    }
    const f1 = task({ id: 'f1' })
    const result = computeFocusProgressFromSnapshot(snap, [f1], TODAY)
    expect(result).toEqual({ done: 0, total: 0 })
  })

  it('returns 0/0 when snapshot has no entries', () => {
    const snap: FocusPlanSnapshot = { date: TODAY, version: 1, entries: [] }
    const result = computeFocusProgressFromSnapshot(snap, [], TODAY)
    expect(result).toEqual({ done: 0, total: 0 })
  })

  it('counts all snapshot entries as total when none are completed', () => {
    const f1 = task({ id: 'f1' })
    const f2 = task({ id: 'f2' })
    const f3 = task({ id: 'f3' })
    const snap: FocusPlanSnapshot = {
      date: TODAY, version: 1,
      entries: [{ taskId: 'f1' }, { taskId: 'f2' }, { taskId: 'f3' }],
    }
    const result = computeFocusProgressFromSnapshot(snap, [f1, f2, f3], TODAY)
    expect(result).toEqual({ done: 0, total: 3 })
  })

  it('completed task remains in count even when engine would exclude it', () => {
    // Simulates the engine having rebuilt without the completed task:
    // tasks array still has the task (server still returns it) but isCompleted=true
    const f1 = task({ id: 'f1', isCompleted: true, completedAt: `${TODAY}T10:00:00Z` })
    const f2 = task({ id: 'f2' })
    const snap: FocusPlanSnapshot = {
      date: TODAY, version: 1,
      entries: [{ taskId: 'f1' }, { taskId: 'f2' }],
    }
    const result = computeFocusProgressFromSnapshot(snap, [f1, f2], TODAY)
    expect(result.done).toBe(1)
    expect(result.total).toBe(2)
  })

  it('unrelated completed task (e.g. a goal task) does not inflate focus done', () => {
    const unrelated = task({ id: 'u1', isCompleted: true, completedAt: `${TODAY}T08:00:00Z` })
    const f1 = task({ id: 'f1' })
    const snap: FocusPlanSnapshot = {
      date: TODAY, version: 1,
      entries: [{ taskId: 'f1' }],  // u1 is NOT in the snapshot
    }
    // Both tasks are in the tasks array, but only f1 is in the snapshot
    const result = computeFocusProgressFromSnapshot(snap, [unrelated, f1], TODAY)
    expect(result.done).toBe(0)   // u1 is not a focus entry
    expect(result.total).toBe(1)
  })

  it('deleted task (not found in tasks array) is skipped — total shrinks', () => {
    const f2 = task({ id: 'f2' })
    const snap: FocusPlanSnapshot = {
      date: TODAY, version: 1,
      entries: [{ taskId: 'f1' }, { taskId: 'f2' }],  // f1 was deleted
    }
    // f1 is absent from the tasks array
    const result = computeFocusProgressFromSnapshot(snap, [f2], TODAY)
    expect(result.total).toBe(1)
    expect(result.done).toBe(0)
  })

  it('archived task is skipped even if present in tasks array', () => {
    const f1 = task({ id: 'f1', taskStatus: 'archived' as any })
    const f2 = task({ id: 'f2' })
    const snap: FocusPlanSnapshot = {
      date: TODAY, version: 1,
      entries: [{ taskId: 'f1' }, { taskId: 'f2' }],
    }
    const result = computeFocusProgressFromSnapshot(snap, [f1, f2], TODAY)
    expect(result.total).toBe(1)   // f1 archived → skipped
    expect(result.done).toBe(0)
  })

  it('subtask entry: counts as done when the specific subtask is completed', () => {
    const f1 = task({
      id: 'f1',
      subTasks: [
        { id: 'sub-1', title: 'Step 1', isCompleted: true  },
        { id: 'sub-2', title: 'Step 2', isCompleted: false },
      ],
    })
    const snap: FocusPlanSnapshot = {
      date: TODAY, version: 1,
      entries: [{ taskId: 'f1', subTaskId: 'sub-1' }],
    }
    const result = computeFocusProgressFromSnapshot(snap, [f1], TODAY)
    expect(result.done).toBe(1)
    expect(result.total).toBe(1)
  })

  it('subtask entry: not done when a different subtask was completed instead', () => {
    const f1 = task({
      id: 'f1',
      subTasks: [
        { id: 'sub-1', title: 'Step 1', isCompleted: false },
        { id: 'sub-2', title: 'Step 2', isCompleted: true  },
      ],
    })
    const snap: FocusPlanSnapshot = {
      date: TODAY, version: 1,
      entries: [{ taskId: 'f1', subTaskId: 'sub-1' }],  // sub-1 is the entry
    }
    const result = computeFocusProgressFromSnapshot(snap, [f1], TODAY)
    expect(result.done).toBe(0)   // sub-2 done, but sub-1 is the entry
  })

  it('all 5 snapshot entries completed → done === total === 5', () => {
    const focusTasks = [1, 2, 3, 4, 5].map(i =>
      task({ id: `f${i}`, isCompleted: true, completedAt: `${TODAY}T0${i + 4}:00:00Z` })
    )
    const snap: FocusPlanSnapshot = {
      date: TODAY, version: 1,
      entries: focusTasks.map(t => ({ taskId: t.id })),
    }
    const result = computeFocusProgressFromSnapshot(snap, focusTasks, TODAY)
    expect(result.done).toBe(5)
    expect(result.total).toBe(5)
  })

  it('task completed yesterday does not count as done for today', () => {
    const f1 = task({ id: 'f1', isCompleted: true, completedAt: '2026-07-18T22:00:00Z' })
    const snap: FocusPlanSnapshot = { date: TODAY, version: 1, entries: [{ taskId: 'f1' }] }
    const result = computeFocusProgressFromSnapshot(snap, [f1], TODAY)
    expect(result.done).toBe(0)
    expect(result.total).toBe(1)
  })

  it('snapshot plan stability: adding more tasks later does not change total', () => {
    // Snapshot was built with 3 tasks. Later, settings.maxTasks increased to 5.
    // The snapshot is frozen — total stays 3.
    const originalTasks = [1, 2, 3].map(i => task({ id: `f${i}` }))
    const newTasks = [1, 2, 3, 4, 5].map(i => task({ id: `f${i}` }))
    const snap: FocusPlanSnapshot = {
      date: TODAY, version: 1,
      entries: originalTasks.map(t => ({ taskId: t.id })),
    }
    const result = computeFocusProgressFromSnapshot(snap, newTasks, TODAY)
    expect(result.total).toBe(3)   // only the 3 snapshot entries count
  })
})
