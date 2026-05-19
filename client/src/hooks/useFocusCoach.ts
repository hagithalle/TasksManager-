import { useState, useCallback, useMemo } from 'react'
import { Priority, ExecutionType, Difficulty } from '../types'
import type { TaskItem } from '../types'
import { TODAY } from '../utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoachSettings {
  /** Target time in "HH:mm" format, e.g. "11:00" */
  targetTime: string
  /** Include tasks with plannedTime before targetTime */
  includeBeforeTargetTime: boolean
  /** Include Critical/High priority tasks */
  includeUrgent: boolean
  /** Include the single highest-priority incomplete task today (frog) */
  includeFrog: boolean
  /** Include Quick execution or duration ≤ 2 min */
  includeTwoMin: boolean
  /** Include tasks with difficulty === Easy */
  includeEasy: boolean
}

export const DEFAULT_SETTINGS: CoachSettings = {
  targetTime:              '11:00',
  includeBeforeTargetTime: true,
  includeUrgent:           true,
  includeFrog:             true,
  includeTwoMin:           true,
  includeEasy:             false,
}

const STORAGE_KEY = 'focusCoachSettings'

function loadSettings(): CoachSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

function saveSettings(s: CoachSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

// Compare "HH:mm" strings
function timeBefore(t: string, target: string): boolean {
  return t.localeCompare(target) < 0
}

const PRIORITY_ORDER: Record<Priority, number> = {
  [Priority.Critical]: 0,
  [Priority.High]:     1,
  [Priority.Medium]:   2,
  [Priority.Low]:      3,
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFocusCoach(tasks: TaskItem[]) {
  const [settings, setSettingsState] = useState<CoachSettings>(loadSettings)

  const setSettings = useCallback((patch: Partial<CoachSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }, [])

  const todayIncomplete = useMemo(
    () => tasks.filter(tk => !tk.isCompleted && tk.dueDate?.startsWith(TODAY)),
    [tasks],
  )

  const allIncomplete = useMemo(
    () => tasks.filter(tk => !tk.isCompleted),
    [tasks],
  )

  // Frog = highest-priority incomplete today task
  const frogId = useMemo(
    () => todayIncomplete.sort(
      (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
    )[0]?.id ?? null,
    [todayIncomplete],
  )

  // Build the eligible set (union of all enabled filters)
  const eligibleTasks = useMemo(() => {
    const ids = new Set<string>()

    if (settings.includeBeforeTargetTime) {
      allIncomplete.forEach(tk => {
        if (tk.plannedTime && timeBefore(tk.plannedTime, settings.targetTime)) ids.add(tk.id)
      })
    }

    if (settings.includeUrgent) {
      allIncomplete.forEach(tk => {
        if (tk.priority === Priority.Critical || tk.priority === Priority.High) ids.add(tk.id)
      })
    }

    if (settings.includeFrog && frogId) {
      ids.add(frogId)
    }

    if (settings.includeTwoMin) {
      allIncomplete.forEach(tk => {
        if (
          tk.executionType === ExecutionType.Quick ||
          tk.executionType === ExecutionType.Short ||
          (tk.durationMinutes != null && tk.durationMinutes <= 2)
        ) ids.add(tk.id)
      })
    }

    if (settings.includeEasy) {
      allIncomplete.forEach(tk => {
        if (tk.difficulty === Difficulty.Easy) ids.add(tk.id)
      })
    }

    const list = allIncomplete.filter(tk => ids.has(tk.id))

    // Sort: plannedTime first, then priority, then duration
    return list.sort((a, b) => {
      if (a.plannedTime && b.plannedTime) return a.plannedTime.localeCompare(b.plannedTime)
      if (a.plannedTime)  return -1
      if (b.plannedTime)  return  1
      const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (pd !== 0) return pd
      return (a.durationMinutes ?? 99) - (b.durationMinutes ?? 99)
    })
  }, [allIncomplete, frogId, settings])

  const completedEligible = useMemo(() => {
    // Count tasks that match eligible criteria but ARE completed
    const ids = new Set(eligibleTasks.map(t => t.id))
    // Also count completed tasks that would have been eligible
    const completedToday = tasks.filter(tk => tk.isCompleted && tk.dueDate?.startsWith(TODAY))
    return completedToday.filter(tk => {
      if (settings.includeBeforeTargetTime && tk.plannedTime && timeBefore(tk.plannedTime, settings.targetTime)) return true
      if (settings.includeUrgent && (tk.priority === Priority.Critical || tk.priority === Priority.High)) return true
      if (settings.includeFrog && tk.id === frogId) return true
      if (settings.includeTwoMin && (tk.executionType === ExecutionType.Quick || tk.executionType === ExecutionType.Short || (tk.durationMinutes != null && tk.durationMinutes <= 2))) return true
      if (settings.includeEasy && tk.difficulty === Difficulty.Easy) return true
      return false
    }).length + (ids.size > 0 ? 0 : 0) // suppress unused warning
  }, [tasks, eligibleTasks, settings, frogId])

  const totalCount     = eligibleTasks.length + completedEligible
  const completedCount = completedEligible
  const progress       = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)
  const nextTask       = eligibleTasks[0] ?? null
  const secondTask     = eligibleTasks[1] ?? null

  return {
    settings,
    setSettings,
    eligibleTasks,
    completedCount,
    totalCount,
    progress,
    nextTask,
    secondTask,
  }
}
