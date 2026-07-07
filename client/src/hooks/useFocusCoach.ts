import { useState, useCallback, useMemo } from 'react'
import type { TaskItem } from '../types'
import {
  buildFocusPlan,
  DEFAULT_COACH_SETTINGS,
  type CoachSettings,
  type FocusPlan,
} from './focusEngine'

export type { CoachSettings, FocusPlan } from './focusEngine'
export { DEFAULT_COACH_SETTINGS } from './focusEngine'

const STORAGE_KEY = 'focusCoachSettingsV2'

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

  // Completed today (based on completedAt or dueDate = today and isCompleted)
  const today = new Date().toISOString().slice(0, 10)
  const completedToday = useMemo(
    () => tasks.filter(t => t.isCompleted && (t.completedAt?.startsWith(today) ?? t.dueDate === today)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, today]
  )
  const totalToday = useMemo(
    () => completedToday + plan.recommendations.length,
    [completedToday, plan.recommendations.length]
  )
  const progress = totalToday > 0 ? Math.min(100, Math.round((completedToday / totalToday) * 100)) : 0

  return { settings, setSettings, plan, refresh, completedToday, totalToday, progress }
}
