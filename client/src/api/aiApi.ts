import apiClient from './apiClient'
import type { TaskItem, Goal, PersonalList } from '../types'

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

// ── Goals Agent ───────────────────────────────────────────────────────────────

export interface AiGoalResult {
  id:             string
  status:         'on-track' | 'at-risk' | 'completed' | 'stalled'
  assessment:     string
  recommendation: string | null
}

export interface AiGoalAnalysisResponse {
  overallMessage: string
  goals:          AiGoalResult[]
  strategy:       string | null
}

// ── List Intelligence Agent ───────────────────────────────────────────────────

export interface AiListItemStat {
  title:       string
  occurrences: number
  lastSeenDate?: string
}

export interface AiListCategory {
  name:  string
  emoji: string
  items: string[]
}

export interface AiListIntelligenceResponse {
  overallMessage:  string
  smartTemplate:   AiListCategory[]
  weeklyStaples:   string[]
  mightNeedSoon:   string[]
  shoppingPattern: string | null
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

/** Compute recurring item stats from all lists */
export function computeRecurringItems(lists: PersonalList[]): AiListItemStat[] {
  const freq = new Map<string, { count: number; lastSeen: string }>()
  for (const list of lists) {
    for (const item of list.items) {
      const key = item.title.toLowerCase().trim()
      const existing = freq.get(key)
      if (!existing) {
        freq.set(key, { count: 1, lastSeen: list.updatedAt })
      } else {
        existing.count++
        if (list.updatedAt > existing.lastSeen) existing.lastSeen = list.updatedAt
      }
    }
  }
  return Array.from(freq.entries())
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([title, v]) => ({
      title,
      occurrences: v.count,
      lastSeenDate: v.lastSeen.slice(0, 10),
    }))
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

async function analyzeGoals(goals: Goal[], language = 'he'): Promise<AiGoalAnalysisResponse> {
  const payload = {
    goals: goals.map(g => ({
      id:             g.id,
      title:          g.title,
      category:       g.category,
      dueDate:        g.dueDate?.slice(0, 10) ?? null,
      totalTasks:     g.totalTasks,
      completedTasks: g.completedTasks,
      createdAt:      g.createdAt,
    })),
    language,
  }
  const { data } = await apiClient.post<AiGoalAnalysisResponse>('/ai/goal-analysis', payload)
  return data
}

async function analyzeLists(lists: PersonalList[], language = 'he'): Promise<AiListIntelligenceResponse> {
  const recurringItems = computeRecurringItems(lists)
  const oldest = lists.reduce((min, l) => l.createdAt < min ? l.createdAt : min, lists[0]?.createdAt ?? new Date().toISOString())
  const daysAgo = Math.floor((Date.now() - new Date(oldest).getTime()) / 86400000)

  const { data } = await apiClient.post<AiListIntelligenceResponse>('/ai/list-intelligence', {
    totalLists:       lists.length,
    oldestListDaysAgo: daysAgo,
    recurringItems,
    recentListTitles:  lists.slice(-5).map(l => l.title),
    language,
  })
  return data
}

export const aiApi = { analyzeDay, searchTasks, getInsights, analyzeGoals, analyzeLists }
