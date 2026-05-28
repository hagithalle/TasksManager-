import apiClient from './apiClient'
import type {
  PersonalList, PersonalListItem, ShoppingItem, ShoppingListSettings,
  CookingItem, CookingIngredient, SuggestedShoppingItem,
} from '../types'
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
  listType?: string
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

// ── Cooking payloads ───────────────────────────────────────────────────────────

export interface CreateCookingItemPayload {
  title: string
  recipeUrl?: string
  ingredients?: CookingIngredient[]
  notes?: string
  plannedDate?: string
  tags?: string[]
  sortOrder?: number
  isCompleted?: boolean
  linkedTaskId?: string
}

export interface UpdateCookingItemPayload {
  title?: string
  recipeUrl?: string
  ingredients?: CookingIngredient[]
  notes?: string
  plannedDate?: string | null
  tags?: string[]
  linkedShoppingListId?: string | null
  linkedTaskId?: string | null
  sortOrder?: number
  isCompleted?: boolean | null
}

export interface PushToShoppingPayload {
  shoppingListId: string
  items: SuggestedShoppingItem[]
}

export interface ExtractIngredientsResult {
  items: SuggestedShoppingItem[]
}

export interface CookingSuggestion {
  title: string
  timesCooked: number
  ingredients: CookingIngredient[]
  tags: string[]
  lastCooked: string
}

// ── Mappers ────────────────────────────────────────────────────────────────────

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

function mapCookingItem(raw: any): CookingItem {
  return {
    id:                   raw.id,
    personalListId:       raw.personalListId,
    title:                raw.title,
    recipeUrl:            raw.recipeUrl ?? undefined,
    ingredients:          Array.isArray(raw.ingredients) ? raw.ingredients : [],
    isCompleted:          raw.isCompleted ?? false,
    linkedTaskId:         raw.linkedTaskId ?? undefined,
    notes:                raw.notes ?? undefined,
    plannedDate:          raw.plannedDate ?? undefined,
    tags:                 Array.isArray(raw.tags) ? raw.tags : [],
    linkedShoppingListId: raw.linkedShoppingListId ?? undefined,
    sortOrder:            raw.sortOrder ?? 0,
    createdAt:            raw.createdAt,
    updatedAt:            raw.updatedAt,
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
    cookingItems:    (raw.cookingItems ?? []).map(mapCookingItem),
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

  // ── Cooking items ──────────────────────────────────────────────────────────

  addCookingItem: async (listId: string, payload: CreateCookingItemPayload): Promise<CookingItem> => {
    const { data } = await apiClient.post<any>(`/personallists/${listId}/cooking-items`, payload)
    return mapCookingItem(data)
  },

  updateCookingItem: async (itemId: string, payload: UpdateCookingItemPayload): Promise<CookingItem> => {
    const { data } = await apiClient.patch<any>(`/personallists/cooking-items/${itemId}`, payload)
    return mapCookingItem(data)
  },

  deleteCookingItem: async (itemId: string): Promise<void> => {
    await apiClient.delete(`/personallists/cooking-items/${itemId}`)
  },

  extractIngredients: async (cookingListId: string, shoppingListId: string): Promise<ExtractIngredientsResult> => {
    const { data } = await apiClient.get<any>(
      `/personallists/${cookingListId}/extract-ingredients`,
      { params: { shoppingListId } }
    )
    return data as ExtractIngredientsResult
  },

  pushToShopping: async (cookingListId: string, payload: PushToShoppingPayload): Promise<void> => {
    await apiClient.post(`/personallists/${cookingListId}/push-to-shopping`, payload)
  },

  getCookingSuggestions: async (): Promise<CookingSuggestion[]> => {
    const { data } = await apiClient.get<any[]>('/personallists/cooking-suggestions')
    return data
  },
}


export interface CreateListPayload {
  userId: string
  title: string
  emoji?: string
  listType?: string
}

export interface UpdateListPayload {
  title?: string
  emoji?: string
  listType?: string
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

// ── Mappers ────────────────────────────────────────────────────────────────────
