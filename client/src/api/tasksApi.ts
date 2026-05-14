import apiClient from './apiClient'
import type { TaskItem, SubTask } from '../types'

export interface CreateTaskPayload {
  userId: string
  title: string
  priority: string
  executionType: string
  difficulty?: string
  dueDate?: string
  plannedTime?: string
  durationMinutes?: number
  goalId?: string
  listId?: string
}

export interface UpdateTaskPayload {
  title?: string
  isCompleted?: boolean
  priority?: string
  executionType?: string
  difficulty?: string
  dueDate?: string
  plannedTime?: string
  durationMinutes?: number
  goalId?: string
  listId?: string
}

export interface CreateSubTaskPayload {
  title: string
  linkedListId?: string
}

export interface UpdateSubTaskPayload {
  title?: string
  isCompleted?: boolean
  linkedListId?: string
}

function mapSubTask(raw: any): SubTask {
  return {
    id:           raw.id,
    title:        raw.title,
    isCompleted:  raw.isCompleted,
    linkedListId: raw.linkedListId ?? undefined,
  }
}

function mapTask(raw: any): TaskItem {
  return {
    id:              raw.id,
    title:           raw.title,
    isCompleted:     raw.isCompleted,
    priority:        raw.priority,
    executionType:   raw.executionType,
    difficulty:      raw.difficulty ?? undefined,
    dueDate:         raw.dueDate ?? undefined,
    plannedTime:     raw.plannedTime ?? undefined,
    durationMinutes: raw.durationMinutes ?? undefined,
    goalId:          raw.goalId ?? undefined,
    listId:          raw.listId ?? undefined,
    subTasks:        (raw.subTasks ?? []).map(mapSubTask),
    createdAt:       raw.createdAt,
    updatedAt:       raw.updatedAt,
  }
}

export const tasksApi = {
  getByUser: async (userId: string): Promise<TaskItem[]> => {
    const { data } = await apiClient.get<any[]>(`/tasks/user/${userId}`)
    return data.map(mapTask)
  },

  getByGoal: async (goalId: string): Promise<TaskItem[]> => {
    const { data } = await apiClient.get<any[]>(`/tasks/goal/${goalId}`)
    return data.map(mapTask)
  },

  getById: async (id: string): Promise<TaskItem> => {
    const { data } = await apiClient.get<any>(`/tasks/${id}`)
    return mapTask(data)
  },

  create: async (payload: CreateTaskPayload): Promise<TaskItem> => {
    const { data } = await apiClient.post<any>('/tasks', payload)
    return mapTask(data)
  },

  update: async (id: string, payload: UpdateTaskPayload): Promise<TaskItem> => {
    const { data } = await apiClient.patch<any>(`/tasks/${id}`, payload)
    return mapTask(data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`)
  },

  addSubTask: async (taskId: string, payload: CreateSubTaskPayload): Promise<SubTask> => {
    const { data } = await apiClient.post<any>(`/tasks/${taskId}/subtasks`, payload)
    return mapSubTask(data)
  },

  updateSubTask: async (subTaskId: string, payload: UpdateSubTaskPayload): Promise<SubTask> => {
    const { data } = await apiClient.patch<any>(`/tasks/subtasks/${subTaskId}`, payload)
    return mapSubTask(data)
  },

  deleteSubTask: async (subTaskId: string): Promise<void> => {
    await apiClient.delete(`/tasks/subtasks/${subTaskId}`)
  },
}
