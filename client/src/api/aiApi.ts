import apiClient from './apiClient'
import type { TaskItem, Goal, PersonalList } from '../types'
import { ListType } from '../types/enums'

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

/** Compute recurring item stats from lists.
 * For shopping lists, uses shoppingItems titles; for other lists, uses regular items. */
export function computeRecurringItems(lists: PersonalList[]): AiListItemStat[] {
  const freq = new Map<string, { count: number; lastSeen: string }>()
  for (const list of lists) {
    const titles = list.listType === ListType.Shopping
      ? list.shoppingItems.map((i) => i.title)
      : list.items.map((i) => i.title)
    for (const title of titles) {
      const key = title.toLowerCase().trim()
      if (!key) continue
      const existing = freq.get(key)
      if (!existing) {
        freq.set(key, { count: 1, lastSeen: list.updatedAt })
      } else {
        existing.count++
        if (list.updatedAt > existing.lastSeen) existing.lastSeen = list.updatedAt
      }
    }
  }
  const all = Array.from(freq.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([title, v]) => ({
      title,
      occurrences: v.count,
      lastSeenDate: v.lastSeen.slice(0, 10),
    }))
  // prefer items seen in 2+ lists; fall back to all items if not enough recurring
  const recurring = all.filter(i => i.occurrences >= 2)
  return recurring.length >= 5 ? recurring : all
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

// ── Plan Analysis ─────────────────────────────────────────────────────────────

export interface AiPlanSubTask {
  title: string
  estimatedMinutes: number | null
}

export interface AiPlanTask {
  title: string
  relatedGoal: string | null
  dueDate: string | null
  priority: string
  executionType: string
  estimatedMinutes: number | null
  frequency: 'once' | 'daily' | 'weekly' | null
  subTasks: AiPlanSubTask[]
}

export interface AiPlanGoal {
  title: string
  category: string
  dueDate: string | null
  priority: string
  estimatedTotalHours: number | null
  rationale: string | null
}

export interface AiPlanResponse {
  summary: string
  goals: AiPlanGoal[]
  tasks: AiPlanTask[]
}

async function analyzePlan(text: string, language = 'he'): Promise<AiPlanResponse> {
  const { data } = await apiClient.post<AiPlanResponse>('/ai/plan', { text, language })
  return data
}

// ── Shabbat Planner ───────────────────────────────────────────────────────────

export interface ShabbatPlanDish {
  title:    string
  mealSlot: string
  tags:     string[]
  notes:    string | null
  isNew:    boolean
}

export interface ShabbatPlanResponse {
  message: string
  dishes:  ShabbatPlanDish[]
}

export interface CookingHistoryItem {
  title:      string
  timesCooked: number
  ingredients: { title: string; quantity?: number; unit?: string }[]
  tags:        string[]
  lastCooked:  string
}

async function planShabbat(cookingHistory: CookingHistoryItem[], language = 'he'): Promise<ShabbatPlanResponse> {
  const { data } = await apiClient.post<ShabbatPlanResponse>('/ai/shabbat-plan', { cookingHistory, language })
  return data
}

export const aiApi = { analyzeDay, searchTasks, getInsights, analyzeGoals, analyzeLists, analyzePlan, planShabbat }
