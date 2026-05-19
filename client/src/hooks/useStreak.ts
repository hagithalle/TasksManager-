import { useMemo, useEffect } from 'react'
import type { TaskItem } from '../types'
import { TODAY } from '../utils'

const STORAGE_KEY = 'streakHistory'

// ─── localStorage helpers ────────────────────────────────────────────────────

function loadHistory(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveHistory(h: Set<string>) {
  // Keep only the last 90 days to avoid unbounded growth
  const sorted = [...h].sort().slice(-90)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
}

function dateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

// ─── Streak calculation ───────────────────────────────────────────────────────

function calcStreak(history: Set<string>): number {
  if (!history.has(TODAY)) return 0
  let streak = 1
  let i = 1
  while (history.has(dateStr(i))) {
    streak++
    i++
  }
  return streak
}

// Hebrew one-letter abbreviation for a date
const HE_DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'] // Sun=0 … Sat=6

export interface DayStatus {
  label: string    // Hebrew letter abbreviation
  dateStr: string  // YYYY-MM-DD
  isActive: boolean
  isToday: boolean
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStreak(tasks: TaskItem[]) {
  // Mark today as active if at least one task was completed today
  const hasCompletedToday = tasks.some(
    (tk) => tk.isCompleted && (tk.updatedAt?.startsWith(TODAY) || tk.createdAt?.startsWith(TODAY)),
  )

  useEffect(() => {
    if (hasCompletedToday) {
      const h = loadHistory()
      if (!h.has(TODAY)) {
        h.add(TODAY)
        saveHistory(h)
      }
    }
  }, [hasCompletedToday])

  const { streak, last7 } = useMemo(() => {
    const history = loadHistory()
    // Re-mark today in the memo so the UI is consistent on first render
    if (hasCompletedToday) history.add(TODAY)

    const streak = calcStreak(history)

    // Last 7 days, oldest → newest
    const last7: DayStatus[] = Array.from({ length: 7 }, (_, i) => {
      const ago  = 6 - i   // 6 daysAgo → 0 daysAgo
      const ds   = dateStr(ago)
      const dow  = new Date(ds).getDay()  // 0=Sun … 6=Sat
      return {
        label:    HE_DAYS[dow],
        dateStr:  ds,
        isActive: history.has(ds),
        isToday:  ds === TODAY,
      }
    })

    return { streak, last7 }
  }, [hasCompletedToday])

  return { streak, last7 }
}
