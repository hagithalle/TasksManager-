import type { TaskItem } from '../types'
import { TaskStatus } from '../types/enums'
import { isDoneForToday } from './useFocusCoach'
import type { FocusPlanSnapshot } from './useFocusCoach'

export interface SectionProgress {
  done:  number
  total: number
}

export interface CoachProgress {
  morning: SectionProgress
  focus:   SectionProgress
  habits:  SectionProgress
}

export type EncouragementKey =
  | 'begin'
  | 'morningStarted'
  | 'morningDone'
  | 'focusProgress'
  | 'allDone'

/**
 * Compute focus-section progress from the daily plan snapshot.
 *
 * The snapshot is frozen at the start of the day so completed tasks remain
 * counted even after the live engine removes them from its selection pool.
 * Returns {done:0, total:0} when no snapshot exists for today (first render
 * before the useEffect fires, or localStorage unavailable).
 */
export function computeFocusProgressFromSnapshot(
  snapshot: FocusPlanSnapshot | null,
  tasks:    TaskItem[],
  today:    string,
): SectionProgress {
  if (!snapshot || snapshot.date !== today || snapshot.entries.length === 0) {
    return { done: 0, total: 0 }
  }

  const taskMap = new Map(tasks.map(t => [t.id, t]))
  let done = 0, total = 0

  for (const entry of snapshot.entries) {
    const task = taskMap.get(entry.taskId)
    // Skip tasks that were deleted from the server or are no longer accessible
    if (!task) continue
    // Skip tasks that have been archived or missed since the snapshot was taken
    if (task.taskStatus === TaskStatus.Archived || task.taskStatus === TaskStatus.Missed) continue

    total++

    if (entry.subTaskId) {
      const sub = task.subTasks?.find(s => s.id === entry.subTaskId)
      if (sub?.isCompleted) done++
    } else {
      if (isDoneForToday(task, today)) done++
    }
  }

  return { done, total }
}

/**
 * Compute per-section progress for the Smart Coach summary row.
 *
 * Focus progress uses the daily plan snapshot for accuracy — completed tasks
 * remain in the count even after the live engine rebuilds without them.
 */
export function computeCoachProgress(
  displayRoutines: TaskItem[],
  displayHabits:   TaskItem[],
  tasks:           TaskItem[],
  snapshot:        FocusPlanSnapshot | null,
  today:           string,
): CoachProgress {
  const morningDone  = displayRoutines.filter(r => isDoneForToday(r, today)).length
  const morningTotal = displayRoutines.length
  const habitsDone   = displayHabits.filter(h => isDoneForToday(h, today)).length
  const habitsTotal  = displayHabits.length
  const focus = computeFocusProgressFromSnapshot(snapshot, tasks, today)

  return {
    morning: { done: morningDone, total: morningTotal },
    focus,
    habits:  { done: habitsDone,  total: habitsTotal  },
  }
}

/**
 * Returns a deterministic encouragement key from per-section progress.
 * Rules evaluated in ascending priority; the highest applicable key is returned.
 */
export function getEncouragementKey(p: CoachProgress): EncouragementKey {
  const totalAll = p.morning.total + p.focus.total + p.habits.total
  if (
    totalAll > 0 &&
    p.morning.done === p.morning.total &&
    p.focus.done   === p.focus.total   &&
    p.habits.done  === p.habits.total
  ) return 'allDone'

  if (p.focus.done > 0) return 'focusProgress'

  if (p.morning.total > 0 && p.morning.done === p.morning.total) return 'morningDone'

  if (p.morning.done > 0) return 'morningStarted'

  return 'begin'
}
