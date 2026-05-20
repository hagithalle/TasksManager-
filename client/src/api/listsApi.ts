import apiClient from './apiClient'
import type { PersonalList, PersonalListItem, ShoppingItem, ShoppingListSettings } from '../types'
import { ListType, ShoppingDepartment, ShoppingItemType } from '../types/enums'

export interface CreateListPayload {
  userId: string
  title: string
  emoji?: string
  listType?: string
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

export interface CreateShoppingItemPayload {
  title: string
  quantity?: number
  unit?: string
  department?: string
  itemType?: string
  sortOrder?: number
  imageUrl?: string
  preferredBrand?: string
  alternativeBrands?: string[]
  noteForBuyer?: string
}

export interface UpdateShoppingItemPayload {
  title?: string
  quantity?: number
  unit?: string
  department?: string
  itemType?: string
  isActive?: boolean
  isBought?: boolean
  sortOrder?: number
  imageUrl?: string
  preferredBrand?: string
  alternativeBrands?: string[]
  noteForBuyer?: string
}

export interface UpdateShoppingSettingsPayload {
  enableSmartSuggestions?: boolean
  occasionalIntervalDays?: number
  groupByDepartment?: boolean
  showBoughtSection?: boolean
}

function mapItem(raw: any): PersonalListItem {
  return {
    id:          raw.id,
    title:       raw.title,
    isCompleted: raw.isCompleted,
    sortOrder:   raw.sortOrder ?? 0,
  }
}

function mapShoppingItem(raw: any): ShoppingItem {
  return {
    id:             raw.id,
    personalListId: raw.personalListId,
    title:          raw.title,
    quantity:       raw.quantity ?? undefined,
    unit:           raw.unit ?? undefined,
    department:     (raw.department as ShoppingDepartment) ?? ShoppingDepartment.Other,
    itemType:       (raw.itemType as ShoppingItemType) ?? ShoppingItemType.Regular,
    isActive:       raw.isActive ?? true,
    isBought:       raw.isBought ?? false,
    boughtAt:       raw.boughtAt ?? undefined,
    lastBoughtAt:   raw.lastBoughtAt ?? undefined,
    sortOrder:      raw.sortOrder ?? 0,
    imageUrl:       raw.imageUrl ?? undefined,
    preferredBrand: raw.preferredBrand ?? undefined,
    alternativeBrands: Array.isArray(raw.alternativeBrands) ? raw.alternativeBrands : [],
    noteForBuyer:   raw.noteForBuyer ?? undefined,
  }
}

function mapSettings(raw: any): ShoppingListSettings {
  return {
    enableSmartSuggestions: raw.enableSmartSuggestions ?? true,
    occasionalIntervalDays: raw.occasionalIntervalDays ?? 30,
    groupByDepartment:      raw.groupByDepartment ?? true,
    showBoughtSection:      raw.showBoughtSection ?? true,
  }
}

function mapList(raw: any): PersonalList {
  return {
    id:              raw.id,
    title:           raw.title,
    emoji:           raw.emoji ?? undefined,
    listType:        (raw.listType as ListType) ?? ListType.Checklist,
    items:           (raw.items ?? []).map(mapItem),
    shoppingItems:   (raw.shoppingItems ?? []).map(mapShoppingItem),
    shoppingSettings: raw.shoppingSettings ? mapSettings(raw.shoppingSettings) : undefined,
    createdAt:       raw.createdAt,
    updatedAt:       raw.updatedAt,
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

  // ── Generic list items ─────────────────────────────────────────────────────

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

  // ── Shopping items ─────────────────────────────────────────────────────────

  addShoppingItem: async (listId: string, payload: CreateShoppingItemPayload): Promise<ShoppingItem> => {
    const { data } = await apiClient.post<any>(`/personallists/${listId}/shopping-items`, payload)
    return mapShoppingItem(data)
  },

  updateShoppingItem: async (itemId: string, payload: UpdateShoppingItemPayload): Promise<ShoppingItem> => {
    const { data } = await apiClient.patch<any>(`/personallists/shopping-items/${itemId}`, payload)
    return mapShoppingItem(data)
  },

  deleteShoppingItem: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/personallists/shopping-items/${itemId}`)
  },

  // ── Shopping settings ──────────────────────────────────────────────────────

  updateShoppingSettings: async (listId: string, payload: UpdateShoppingSettingsPayload): Promise<ShoppingListSettings> => {
    const { data } = await apiClient.put<any>(`/personallists/${listId}/shopping-settings`, payload)
    return mapSettings(data)
  },

  // ── Clear trip ─────────────────────────────────────────────────────────────

  clearTrip: async (listId: string): Promise<PersonalList> => {
    const { data } = await apiClient.post<any>(`/personallists/${listId}/clear-trip`, {})
    return mapList(data)
  },
}

