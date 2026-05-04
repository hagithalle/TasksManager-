import { ExecutionType, Priority } from '../types'
import type { TaskItem } from '../types'

// ─── Date ─────────────────────────────────────────────────────────────────────

/** Today's date as YYYY-MM-DD, computed once at app startup. */
export const TODAY = new Date().toISOString().slice(0, 10)

// ─── Filter ───────────────────────────────────────────────────────────────────

export type Filter = 'all' | 'today' | 'urgent' | 'completed'

export function applyFilter(tasks: TaskItem[], filter: Filter): TaskItem[] {
  switch (filter) {
    case 'today':
      return tasks.filter((t) => !t.isCompleted && t.dueDate?.startsWith(TODAY))
    case 'urgent':
      return tasks.filter(
        (t) => !t.isCompleted && (t.priority === Priority.Critical || t.priority === Priority.High),
      )
    case 'completed':
      return tasks.filter((t) => t.isCompleted)
    default:
      return tasks
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
