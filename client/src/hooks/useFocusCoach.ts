import { useState, useCallback, useMemo } from 'react'
import type { TaskItem } from '../types'
import { DailyRole, TaskStatus } from '../types/enums'
import {
  buildFocusPlan,
  DEFAULT_COACH_SETTINGS,
  isCompletedInCurrentPeriod,
  type CoachSettings,
  type FocusPlan,
} from './focusEngine'

export type { CoachSettings, FocusPlan } from './focusEngine'
export { DEFAULT_COACH_SETTINGS } from './focusEngine'

const STORAGE_KEY = 'focusCoachSettingsV2'

/**
 * Returns true when a routine or habit task should be considered "done for today":
 * - recurring task completed in the current period, OR
 * - non-recurring task marked complete today.
 */
export function isDoneForToday(task: TaskItem, today: string): boolean {
  if (isCompletedInCurrentPeriod(task)) return true
  return task.isCompleted && (task.completedAt?.startsWith(today) ?? false)
}

import type { SubTask } from '../types'

/**
 * Returns the first incomplete subtask, or undefined if none exist or all done.
 * Used by HabitProgressItem to identify which subtask "+1" completes.
 */
export function getNextIncompleteSubTask(task: TaskItem): SubTask | undefined {
  return (task.subTasks ?? []).find(s => !s.isCompleted)
}

function loadSettings(): CoachSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_COACH_SETTINGS
    return { ...DEFAULT_COACH_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_COACH_SETTINGS
  }
}

function saveSettings(s: CoachSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function useFocusCoach(tasks: TaskItem[]) {
  const [settings, setSettingsState] = useState<CoachSettings>(loadSettings)
  const [tick, setTick] = useState(0)

  const setSettings = useCallback((patch: Partial<CoachSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const refresh = useCallback(() => setTick(t => t + 1), [])

  // Rebuild the plan whenever tasks, settings, or a manual refresh changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plan: FocusPlan = useMemo(() => buildFocusPlan(tasks, settings), [tasks, settings, tick])

  const today = new Date().toISOString().slice(0, 10)

  // Display groups for routines and habits include completed-this-period items
  // so the UI can show a success state. This is a display concern only — the
  // engine (focusEngine) continues to return only incomplete items for selection.
  const displayRoutines = useMemo(() =>
    tasks.filter(t =>
      t.dailyRole === DailyRole.MorningRoutine &&
      t.taskStatus !== TaskStatus.Archived &&
      t.taskStatus !== TaskStatus.Missed &&
      (!t.isCompleted || isDoneForToday(t, today))
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, today]
  )

  const displayHabits = useMemo(() =>
    tasks.filter(t =>
      t.dailyRole === DailyRole.OngoingHabit &&
      t.taskStatus !== TaskStatus.Archived &&
      t.taskStatus !== TaskStatus.Missed &&
      (!t.isCompleted || isDoneForToday(t, today))
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, today]
  )

  // Completed today (based on completedAt or dueDate = today and isCompleted)
  const completedToday = useMemo(
    () => tasks.filter(t => t.isCompleted && (t.completedAt?.startsWith(today) ?? t.dueDate === today)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, today]
  )
  const totalToday = useMemo(
    () => completedToday + plan.focusTasks.length,
    [completedToday, plan.focusTasks.length]
  )
  const progress = totalToday > 0 ? Math.min(100, Math.round((completedToday / totalToday) * 100)) : 0

  return { settings, setSettings, plan, refresh, completedToday, totalToday, progress, displayRoutines, displayHabits, today }
}
