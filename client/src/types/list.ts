import type { ListType, ShoppingDepartment, ShoppingItemType, MealSlot, CookingMode } from './enums'

export interface PersonalListItem {
  id: string

  /** Item label */
  title: string

  isCompleted: boolean

  /** Optional ordering hint */
  sortOrder?: number
}

export interface ShoppingItem {
  id: string
  personalListId: string
  title: string
  quantity?: number
  unit?: string
  department: ShoppingDepartment
  itemType: ShoppingItemType
  /** True when the item is on the current shopping trip */
  isActive: boolean
  /** True when checked off in the current trip */
  isBought: boolean
  boughtAt?: string
  lastBoughtAt?: string
  sortOrder: number
  // ── Product details (for sending someone else shopping) ──
  imageUrl?: string
  preferredBrand?: string
  alternativeBrands: string[]
  noteForBuyer?: string
}

export interface ShoppingListSettings {
  enableSmartSuggestions: boolean
  occasionalIntervalDays: number
  groupByDepartment: boolean
  showBoughtSection: boolean
}

// ── Cooking types ─────────────────────────────────────────────────────────────

export interface CookingIngredient {
  title: string
  quantity?: number
  unit?: string
}

export interface CookingItem {
  id: string
  personalListId: string
  title: string
  recipeUrl?: string
  ingredients: CookingIngredient[]
  notes?: string
  /** ISO date string (YYYY-MM-DD) */
  plannedDate?: string
  tags: string[]
  linkedShoppingListId?: string
  /** True when the cooking item was marked as completed (cooked) */
  isCompleted: boolean
  /** Meal slot this dish belongs to (Shabbat or weekday category) */
  mealSlot: MealSlot
  sortOrder: number
    /** Linked task id (if this cooking item was converted to a task) */
    linkedTaskId?: string
  createdAt: string
  updatedAt: string
}

// ── Suggested shopping item from ingredient extraction ─────────────────────────

export interface SuggestedShoppingItem {
  title: string
  quantity?: number
  unit?: string
  department: string
  isAlreadyOnList: boolean
}

export interface PersonalList {
  id: string

  /** User-facing list name */
  title: string

  /** Emoji used as the list icon in the UI */
  emoji?: string

  /** The type / purpose of the list */
  listType: ListType

  /** For cooking plan lists: Shabbat or regular weekday mode */
  cookingMode: CookingMode

  /** True when the user has archived/completed this list */
  isArchived: boolean

  /** Generic checklist items (non-shopping lists) */
  items: PersonalListItem[]

  /** Shopping items (only populated for shopping lists) */
  shoppingItems: ShoppingItem[]

  /** Shopping-specific settings (only present for shopping lists) */
  shoppingSettings?: ShoppingListSettings

  /** Cooking plan items (only populated for cooking plan lists) */
  cookingItems: CookingItem[]

  createdAt: string
  updatedAt: string
}

/** Derived count helper — use instead of list.items.length in UI */
export function listItemCount(list: PersonalList): number {
  return list.items.length
}

