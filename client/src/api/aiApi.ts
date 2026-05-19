import apiClient from './apiClient'
import type { TaskItem } from '../types'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AiTaskSummary {
  id:              string
  title:           string
  priority:        string
  executionType:   string
  durationMinutes?: number
  plannedTime?:    string
  dueDate?:        string
}

export interface AiMoveTask {
  id:     string
  reason: string
}

export interface AiDayAnalysis {
  loadLevel:    'light' | 'moderate' | 'heavy' | 'overloaded'
  message:      string
  encouragement: string
  tasksToMove:  AiMoveTask[]
}

export interface AiSearchResult {
  taskIds:     string[]
  explanation: string
}

export interface AiWeekDayStat {
  date:      string
  total:     number
  completed: number
}

export interface AiInsightsRequest {
  totalTasks:          number
  completedTasks:      number
  overdueTasks:        number
  frogTasksCompleted:  number
  frogTasksTotal:      number
  last7Days:           AiWeekDayStat[]
  language?:           string
}

export interface AiPattern {
  type:       'procrastination' | 'overload' | 'strength' | 'tip'
  message:    string
  suggestion: string | null
  emoji:      string
}

export interface AiInsightsResponse {
  overallMessage: string
  patterns:       AiPattern[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function toAiTaskSummary(task: TaskItem): AiTaskSummary {
  return {
    id:             task.id,
    title:          task.title,
    priority:       task.priority,
    executionType:  task.executionType,
    durationMinutes: task.durationMinutes,
    plannedTime:    task.plannedTime,
    dueDate:        task.dueDate,
  }
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function analyzeDay(tasks: TaskItem[], language = 'he'): Promise<AiDayAnalysis> {
  const { data } = await apiClient.post<AiDayAnalysis>('/ai/day-analysis', {
    tasks: tasks.map(toAiTaskSummary),
    language,
  })
  return data
}

async function searchTasks(query: string, tasks: TaskItem[], language = 'he'): Promise<AiSearchResult> {
  const { data } = await apiClient.post<AiSearchResult>('/ai/search', {
    query,
    tasks: tasks.map(toAiTaskSummary),
    language,
  })
  return data
}

async function getInsights(req: AiInsightsRequest): Promise<AiInsightsResponse> {
  const { data } = await apiClient.post<AiInsightsResponse>('/ai/insights', req)
  return data
}

export const aiApi = { analyzeDay, searchTasks, getInsights }
