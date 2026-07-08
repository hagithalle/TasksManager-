import { Priority, ExecutionType, Difficulty, RecurrenceType, TaskNature, TaskStatus } from './enums'

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

  /** ISO date string, e.g. "2025-06-15" */
  dueDate?: string
}

export interface TaskItem {
    /** If this is a subtask, id of the parent task */
    parentId?: string

    /** True if this is a subtask (flattened for UI/filtering) */
    isSubTask?: boolean
  id: string

  /** User-facing title */
  title: string

  /** Optional notes / description */
  notes?: string

  isCompleted: boolean

  /** UTC timestamp when the task was completed */
  completedAt?: string

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

  /** UTC datetime string for a one-time reminder notification */
  reminderAt?: string

  /** Minutes before due date to fire the reminder (e.g. 60 = 1 hour before).
   *  When set, the backend computes reminderAt automatically. */
  reminderOffsetMinutes?: number

  /** How often this task recurs after completion */
  recurrenceType?: RecurrenceType

  /** Recurrence interval (e.g. every 2 days/weeks/months) */
  recurrenceInterval?: number

  /** ISO date string of the most recent completion for recurring tasks.
   *  The task resets each period (daily/weekly/monthly) regardless of this value. */
  lastCompletedDate?: string

  /** Whether this is a regular action, a meeting, or an appointment */
  taskNature?: TaskNature

  /** Lifecycle status (open / completed / archived / missed / carriedOver) */
  taskStatus?: TaskStatus

  createdAt: string
  updatedAt: string
}
