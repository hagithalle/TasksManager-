import { ExecutionType, Priority } from '../types'
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

export type Filter = 'all' | 'today' | 'urgent' | 'completed'

export function isArchivedCompleted(task: TaskItem): boolean {
  if (!task.isCompleted || !task.completedAt) return false

  return Date.now() - new Date(task.completedAt).getTime() > HOURS_24_MS
}

function isActiveDaily(item: DailyItem): boolean {
  if (item.recurrenceType !== 'daily') return true

  return !item.isCompleted || item.dueDate !== TODAY
}

function flattenTasks(tasks: TaskItem[]): TaskLike[] {
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

export function applyFilter(tasks: TaskItem[], filter: Filter): TaskLike[] {
  const allItems = flattenTasks(tasks)

  switch (filter) {
    case 'today':
      return allItems.filter(
        task =>
          !task.isCompleted &&
          task.dueDate?.startsWith(TODAY) &&
          isActiveDaily(task)
      )

    case 'urgent':
      return allItems.filter(
        task =>
          !task.isCompleted &&
          (task.priority === Priority.Critical || task.priority === Priority.High) &&
          isActiveDaily(task)
      )

    case 'completed':
      return allItems.filter(task => task.isCompleted)

    case 'all':
    default:
      return allItems.filter(isActiveDaily)
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