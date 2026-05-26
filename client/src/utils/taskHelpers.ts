import { ExecutionType, Priority } from '../types'
import type { TaskItem } from '../types'

// ─── Date ─────────────────────────────────────────────────────────────────────

/** Today's date as YYYY-MM-DD, computed once at app startup. */
export const TODAY = new Date().toISOString().slice(0, 10)

const HOURS_24_MS = 24 * 60 * 60 * 1000

/**
 * Returns true when a completed task was finished more than 24 hours ago
 * and should be hidden from all UI views (data is kept in the DB).
 */
export function isArchivedCompleted(task: TaskItem): boolean {
  if (!task.isCompleted || !task.completedAt) return false
  return Date.now() - new Date(task.completedAt).getTime() > HOURS_24_MS
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export type Filter = 'all' | 'today' | 'urgent' | 'completed'

export function applyFilter(tasks: TaskItem[], filter: Filter): TaskItem[] {
  // Helper: should show daily task or subtask today?
  const isActiveDaily = (item: { isCompleted: boolean; dueDate?: string; recurrenceType?: string }) => {
    if (item.recurrenceType === 'daily') {
      return !item.isCompleted || item.dueDate !== TODAY
    }
    return true
  }

  // Flatten tasks and subtasks for filtering and display
  const flattenTasks = (tasks: TaskItem[]): TaskItem[] => {
    const result: TaskItem[] = []
    for (const t of tasks) {
      // Add main task
      result.push(t)
      // Add subtasks as separate items (inherit recurrenceType/dueDate from parent if missing)
      if (t.subTasks && t.subTasks.length > 0) {
        for (const sub of t.subTasks) {
          result.push({
            ...t,
            ...sub,
            id: `${t.id}__sub__${sub.id}`,
            parentId: t.id,
            isCompleted: sub.isCompleted,
            title: sub.title,
            dueDate: sub.dueDate || t.dueDate,
            recurrenceType: sub.recurrenceType || t.recurrenceType,
            isSubTask: true,
          })
        }
      }
    }
    return result
  }

  const allItems = flattenTasks(tasks)

  switch (filter) {
    case 'today':
      return allItems.filter((t) => !t.isCompleted && t.dueDate?.startsWith(TODAY) && isActiveDaily(t))
    case 'urgent':
      return allItems.filter(
        (t) => !t.isCompleted && (t.priority === Priority.Critical || t.priority === Priority.High) && isActiveDaily(t),
      )
    case 'completed':
      return allItems.filter((t) => t.isCompleted)
    default:
      return allItems.filter(isActiveDaily)
  }
}

// ─── Colour maps ──────────────────────────────────────────────────────────────

/** Chip / badge background + text colour for each priority level */
export const PRIORITY_STYLE: Record<Priority, { bg: string; color: string }> = {
  [Priority.Low]:      { bg: '#E8F5E9', color: '#2E7D32' },
  [Priority.Medium]:   { bg: '#FFF8E1', color: '#F57F17' },
  [Priority.High]:     { bg: '#FFEBEE', color: '#C62828' },
  [Priority.Critical]: { bg: '#F3E5F5', color: '#6A1B9A' },
}

/** Inline dot / accent colour for each priority level */
export const PRIORITY_COLOR: Record<string, string> = {
  low: '#4CAF50', medium: '#FF9800', high: '#F44336', critical: '#9C27B0',
}

/** Chip / badge background + text colour for each execution type */
export const EXECUTION_STYLE: Record<ExecutionType, { bg: string; color: string }> = {
  [ExecutionType.Quick]:  { bg: '#E0F7FA', color: '#00695C' },
  [ExecutionType.Short]:  { bg: '#E3F2FD', color: '#1565C0' },
  [ExecutionType.Medium]: { bg: '#FFF3E0', color: '#E65100' },
  [ExecutionType.Long]:   { bg: '#EDE9FF', color: '#5438CC' },
}
