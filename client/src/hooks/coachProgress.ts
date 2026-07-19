import type { TaskItem } from '../types'
import { isDoneForToday } from './useFocusCoach'

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
 * Compute per-section progress for the Smart Coach summary row.
 *
 * focusDone is approximated as completedToday minus routine + habit completions.
 * This matches how the existing combined progress bar works and avoids needing
 * a separate "completed focus tasks" tracking store.
 */
export function computeCoachProgress(
  displayRoutines:   TaskItem[],
  displayHabits:     TaskItem[],
  completedToday:    number,
  focusPendingCount: number,
  today:             string,
): CoachProgress {
  const morningDone  = displayRoutines.filter(r => isDoneForToday(r, today)).length
  const morningTotal = displayRoutines.length
  const habitsDone   = displayHabits.filter(h => isDoneForToday(h, today)).length
  const habitsTotal  = displayHabits.length
  const focusDone    = Math.max(0, completedToday - morningDone - habitsDone)
  const focusTotal   = focusPendingCount + focusDone

  return {
    morning: { done: morningDone, total: morningTotal },
    focus:   { done: focusDone,   total: focusTotal   },
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
