import apiClient from './apiClient'
import type { PersonalList, PersonalListItem } from '../types'

export interface CreateListPayload {
  userId: string
  title: string
  emoji?: string
}

export interface UpdateListPayload {
  title?: string
  emoji?: string
}

export interface CreateListItemPayload {
  title: string
  sortOrder?: number
}

export interface UpdateListItemPayload {
  title?: string
  isCompleted?: boolean
  sortOrder?: number
}

function mapItem(raw: any): PersonalListItem {
  return {
    id:          raw.id,
    title:       raw.title,
    isCompleted: raw.isCompleted,
    sortOrder:   raw.sortOrder ?? 0,
  }
}

function mapList(raw: any): PersonalList {
  return {
    id:        raw.id,
    title:     raw.title,
    emoji:     raw.emoji ?? undefined,
    items:     (raw.items ?? []).map(mapItem),
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

export const listsApi = {
  getByUser: async (userId: string): Promise<PersonalList[]> => {
    const { data } = await apiClient.get<any[]>(`/personallists/user/${userId}`)
    return data.map(mapList)
  },

  getById: async (id: string): Promise<PersonalList> => {
    const { data } = await apiClient.get<any>(`/personallists/${id}`)
    return mapList(data)
  },

  create: async (payload: CreateListPayload): Promise<PersonalList> => {
    const { data } = await apiClient.post<any>('/personallists', payload)
    return mapList(data)
  },

  update: async (id: string, payload: UpdateListPayload): Promise<PersonalList> => {
    const { data } = await apiClient.patch<any>(`/personallists/${id}`, payload)
    return mapList(data)
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/personallists/${id}`)
  },

  addItem: async (listId: string, payload: CreateListItemPayload): Promise<PersonalListItem> => {
    const { data } = await apiClient.post<any>(`/personallists/${listId}/items`, payload)
    return mapItem(data)
  },

  updateItem: async (itemId: string, payload: UpdateListItemPayload): Promise<PersonalListItem> => {
    const { data } = await apiClient.patch<any>(`/personallists/items/${itemId}`, payload)
    return mapItem(data)
  },

  deleteItem: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/personallists/items/${itemId}`)
  },
}
