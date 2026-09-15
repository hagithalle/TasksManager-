import { DailyRole, ExecutionType, Priority, TaskStatus } from '../types'
import type { TaskItem } from '../types'

export const TODAY = new Date().toISOString().slice(0, 10)

const HOURS_24_MS = 24 * 60 * 60 * 1000

type TaskLike = TaskItem & {
  parentId?: string
  isSubTask?: boolean
}

type DailyItem = {
  isCompleted: boolean
  dueDate?: string
  recurrenceType?: string
}

export type Filter = 'all' | 'today' | 'urgent' | 'completed' | 'habits'

export function isArchivedCompleted(task: TaskItem): boolean {
  if (!task.isCompleted || !task.completedAt) return false

  return Date.now() - new Date(task.completedAt).getTime() > HOURS_24_MS
}

function isActiveDaily(item: DailyItem): boolean {
  if (item.recurrenceType !== 'daily') return true

  return !item.isCompleted || item.dueDate !== TODAY
}

export function flattenTasks(tasks: TaskItem[]): TaskLike[] {
  return tasks.flatMap(task => {
    const subTasks =
      task.subTasks?.map(subTask => ({
        ...task,
        ...subTask,
        id: `${task.id}__sub__${subTask.id}`,
        parentId: task.id,
        isSubTask: true,
        isCompleted: subTask.isCompleted,
        title: subTask.title,
        dueDate: subTask.dueDate || task.dueDate,
        recurrenceType: task.recurrenceType,
      })) ?? []

    return [task, ...subTasks]
  })
}

const isHabitTask = (t: TaskItem) =>
  t.dailyRole === DailyRole.MorningRoutine || t.dailyRole === DailyRole.OngoingHabit

export function applyFilter(tasks: TaskItem[], filter: Filter): TaskItem[] {
  // Archived tasks are always excluded — they live in a separate archive section
  const nonArchived = tasks.filter(t => t.taskStatus !== TaskStatus.Archived)
  switch (filter) {
    case 'habits':
      // Show all non-archived habit/routine tasks regardless of completion
      return nonArchived.filter(isHabitTask)

    case 'today':
      return nonArchived.filter(
        task =>
          !isHabitTask(task) &&
          !task.isCompleted &&
          task.dueDate?.startsWith(TODAY) &&
          isActiveDaily(task)
      )

    case 'urgent':
      return nonArchived.filter(
        task =>
          !isHabitTask(task) &&
          !task.isCompleted &&
          (task.priority === Priority.Critical || task.priority === Priority.High) &&
          isActiveDaily(task)
      )

    case 'completed':
      return nonArchived.filter(task => !isHabitTask(task) && task.isCompleted)

    case 'all':
    default:
      return nonArchived.filter(task => !isHabitTask(task) && isActiveDaily(task))
  }
}

export const PRIORITY_STYLE: Record<Priority, { bg: string; color: string }> = {
  [Priority.Low]: { bg: '#E8F5E9', color: '#2E7D32' },
  [Priority.Medium]: { bg: '#FFF8E1', color: '#F57F17' },
  [Priority.High]: { bg: '#FFEBEE', color: '#C62828' },
  [Priority.Critical]: { bg: '#F3E5F5', color: '#6A1B9A' },
}

export const PRIORITY_COLOR: Record<Priority, string> = {
  [Priority.Low]: '#4CAF50',
  [Priority.Medium]: '#FF9800',
  [Priority.High]: '#F44336',
  [Priority.Critical]: '#9C27B0',
}

export const EXECUTION_STYLE: Record<ExecutionType, { bg: string; color: string }> = {
  [ExecutionType.Quick]: { bg: '#E0F7FA', color: '#00695C' },
  [ExecutionType.Short]: { bg: '#E3F2FD', color: '#1565C0' },
  [ExecutionType.Medium]: { bg: '#FFF3E0', color: '#E65100' },
  [ExecutionType.Long]: { bg: '#EDE9FF', color: '#5438CC' },
}