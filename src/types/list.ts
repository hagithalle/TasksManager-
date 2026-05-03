export interface PersonalListItem {
  id: string

  /** Item label */
  title: string

  isCompleted: boolean

  /** Optional ordering hint */
  sortOrder?: number
}

export interface PersonalList {
  id: string

  /** User-facing list name */
  title: string

  /** Emoji used as the list icon in the UI */
  emoji?: string

  items: PersonalListItem[]

  createdAt: string
  updatedAt: string
}

/** Derived count helper — use instead of list.items.length in UI */
export function listItemCount(list: PersonalList): number {
  return list.items.length
}
