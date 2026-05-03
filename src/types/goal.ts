export type GoalCategory =
  | 'home'
  | 'work'
  | 'health'
  | 'business'
  | 'python'
  | 'hobby'
  | 'personal'

export interface Goal {
  id: string
  title: string
  category: GoalCategory
  progress: number      // 0–100
  totalTasks: number
  completedTasks: number
  dueDate?: string
  isPinned?: boolean
  createdAt: string
  updatedAt: string
}
