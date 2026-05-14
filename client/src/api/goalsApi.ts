import apiClient from './apiClient'
import type { Goal } from '../types'

export interface CreateGoalPayload {
  userId: string
  title: string
  category: string
  goalType: string
  dueDate?: string
  isPinned?: boolean
}

export interface UpdateGoalPayload {
  title?: string
  category?: string
  goalType?: string
  dueDate?: string
  isPinned?: boolean
}

// Map API response (camelCase, numeric progress derived client-side) → Goal
function mapGoal(raw: any): Goal {
  return {
    id:               raw.id,
    title:            raw.title,
    category:         raw.category,
    goalType:         raw.goalType,
    totalTasks:       raw.totalTasks ?? 0,
    completedTasks:   raw.completedTasks ?? 0,
    progress:         raw.totalTasks > 0
                        ? Math.round((raw.completedTasks / raw.totalTasks) * 100)
                        : 0,
    dueDate:          raw.dueDate ?? undefined,
    isPinned:         raw.isPinned ?? false,
    createdAt:        raw.createdAt,
    updatedAt:        raw.updatedAt,
  }
}

export const goalsApi = {
  getByUser: async (userId: string): Promise<Goal[]> => {
    const { data } = await apiClient.get<any[]>(`/goals/user/${userId}`)
    return data.map(mapGoal)
  },

  getById: async (id: string): Promise<Goal> => {
    const { data } = await apiClient.get<any>(`/goals/${id}`)
    return mapGoal(data)
  },

  create: async (payload: CreateGoalPayload): Promise<Goal> => {
    const { data } = await apiClient.post<any>('/goals', payload)
    return mapGoal(data)
  },

  update: async (id: string, payload: UpdateGoalPayload): Promise<Goal> => {
    const { data } = await apiClient.patch<any>(`/goals/${id}`, payload)
    return mapGoal(data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/goals/${id}`)
  },
}
