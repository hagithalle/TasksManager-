import { Priority, ExecutionType, Difficulty } from './enums'

export interface SubTask {
  id: string

  /** User-facing label */
  title: string

  isCompleted: boolean

  executionType?: ExecutionType
  priority?: Priority
  durationMinutes?: number

  /** Optional link to a PersonalList — navigates to /lists/:id */
  linkedListId?: string
}

export interface TaskItem {
  id: string

  /** User-facing title */
  title: string

  isCompleted: boolean

  priority: Priority
  executionType: ExecutionType

  /** Perceived difficulty of this task */
  difficulty?: Difficulty

  /** ISO date string, e.g. "2025-06-15" */
  dueDate?: string

  /** Wall-clock time the user plans to work on this task, e.g. "09:00" */
  plannedTime?: string

  /** Estimated duration in minutes */
  durationMinutes?: number

  /** Foreign key → Goal.id (task belongs to a goal) */
  goalId?: string

  /** Foreign key → PersonalList.id (task belongs to a personal list) */
  listId?: string

  subTasks?: SubTask[]

  createdAt: string
  updatedAt: string
}
