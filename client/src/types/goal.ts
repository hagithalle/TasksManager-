import { GoalType } from './enums'

export interface Goal {
  id: string

  /** User-facing title — stored as plain text; no translation key needed */
  title: string

  category: GoalCategory
  goalType: GoalType

  /** 0–100 percentage; derived from completedTasks / totalTasks */
  progress: number
  totalTasks: number
  completedTasks: number

  /** ISO date string — only relevant for GoalType.Finite */
  dueDate?: string

  /** Only for GoalType.Ongoing — tasks completed this calendar week */
  weeklyCompleted?: number
  /** Only for GoalType.Ongoing — tasks planned for this calendar week */
  weeklyTotal?: number
  /** Only for GoalType.Ongoing — tasks remaining for today */
  todayRemaining?: number

  /** Show this goal at the top of the goals list */
  isPinned?: boolean

  createdAt: string
  updatedAt: string
}
