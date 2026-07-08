import type { PersonalList, PersonalListItem, ShoppingItem, CookingItem } from '../types'
import { ListType, ShoppingDepartment } from '../types/enums'

// Map department enum to i18n translation key
export function getDepartmentTranslationKey(dept: ShoppingDepartment): string {
  const keyMap: Record<ShoppingDepartment, string> = {
    [ShoppingDepartment.FruitsAndVegetables]: 'shoppingDepartment.fruitsAndVegetables',
    [ShoppingDepartment.Dairy]: 'shoppingDepartment.dairy',
    [ShoppingDepartment.MeatAndFish]: 'shoppingDepartment.meatAndFish',
    [ShoppingDepartment.Bakery]: 'shoppingDepartment.bakery',
    [ShoppingDepartment.Pantry]: 'shoppingDepartment.pantry',
    [ShoppingDepartment.Frozen]: 'shoppingDepartment.frozen',
    [ShoppingDepartment.Cleaning]: 'shoppingDepartment.cleaning',
    [ShoppingDepartment.Disposable]: 'shoppingDepartment.disposable',
    [ShoppingDepartment.Baby]: 'shoppingDepartment.baby',
    [ShoppingDepartment.Other]: 'shoppingDepartment.other',
    [ShoppingDepartment.Frequent]: 'shoppingDepartment.frequent',
  }
  return keyMap[dept] || 'shoppingDepartment.other'
}

const DEPARTMENT_EMOJIS: Record<ShoppingDepartment, string> = {
  [ShoppingDepartment.FruitsAndVegetables]: '🥬',
  [ShoppingDepartment.Dairy]: '🧈',
  [ShoppingDepartment.MeatAndFish]: '🥩',
  [ShoppingDepartment.Bakery]: '🥖',
  [ShoppingDepartment.Frozen]: '🧊',
  [ShoppingDepartment.Pantry]: '🥫',
  [ShoppingDepartment.Cleaning]: '🧹',
  [ShoppingDepartment.Disposable]: '📦',
  [ShoppingDepartment.Baby]: '👶',
  [ShoppingDepartment.Other]: '📦',
  [ShoppingDepartment.Frequent]: '⭐',
}

/**
 * Format list for sharing. For shopping lists, returns department keys instead of names
 * so they can be translated by the component using this function.
 */
export function formatListForSharing(list: PersonalList, tDept?: (key: string) => string): string {
  const title = list.title
  const emoji = list.emoji || getEmojiForListType(list.listType)

  let content = `${emoji} ${title}\n`
  content += '='.repeat(title.length + 2) + '\n\n'

  switch (list.listType) {
    case ListType.Shopping:
      content += formatShoppingList(list.shoppingItems, tDept)
      break
    case ListType.CookingPlan:
      content += formatCookingList(list.cookingItems)
      break
    case ListType.Checklist:
    case ListType.Notes:
    case ListType.Ideas:
    case ListType.Equipment:
      content += formatGenericList(list.items)
      break
    default:
      content += formatGenericList(list.items)
  }

  return content
}

function formatShoppingList(items: ShoppingItem[], tDept?: (key: string) => string): string {
  if (items.length === 0) return '(empty list)\n'

  const activeItems = items.filter(i => i.isActive)
  if (activeItems.length === 0) return '(no active items)\n'

  const byDepartment = groupBy(activeItems, 'department')
  const departments = Object.keys(byDepartment) as ShoppingDepartment[]
  const sortedDepts = departments.sort()

  let content = ''
  sortedDepts.forEach((dept, idx) => {
    if (idx > 0) content += '\n'
    const emoji = DEPARTMENT_EMOJIS[dept] || '📦'
    const deptName = tDept ? tDept(getDepartmentTranslationKey(dept)) : dept
    content += `${emoji} ${deptName}\n`
    byDepartment[dept].forEach(item => {
      const qty = item.quantity && item.unit
        ? ` (${item.quantity}${item.unit})`
        : item.quantity ? ` (${item.quantity})` : ''
      content += `  • ${item.title}${qty}\n`
    })
  })

  return content + '\n'
}

function formatCookingList(items: CookingItem[]): string {
  if (items.length === 0) return '(empty list)\n'

  let content = ''
  items.forEach((item, idx) => {
    if (idx > 0) content += '\n'
    const status = item.isCompleted ? '✓' : '○'
    content += `${status} ${item.title}\n`

    if (item.ingredients.length > 0) {
      content += '  Ingredients:\n'
      item.ingredients.forEach(ing => {
        const qty = ing.quantity && ing.unit
          ? ` ${ing.quantity}${ing.unit}`
          : ing.quantity ? ` ${ing.quantity}` : ''
        content += `    - ${ing.title}${qty}\n`
      })
    }

    if (item.notes) {
      content += `  Notes: ${item.notes}\n`
    }

    if (item.recipeUrl) {
      content += `  Recipe: ${item.recipeUrl}\n`
    }
  })

  return content + '\n'
}

function formatGenericList(items: PersonalListItem[]): string {
  if (items.length === 0) return '(empty list)\n'

  let content = ''
  items.forEach(item => {
    const status = item.isCompleted ? '✓' : '○'
    content += `${status} ${item.title}\n`
  })

  return content + '\n'
}

function groupBy<T extends Record<K, any>, K extends PropertyKey>(
  items: T[],
  key: K,
): Record<PropertyKey, T[]> {
  return items.reduce((acc, item) => {
    const groupKey = item[key]
    if (!acc[groupKey]) acc[groupKey] = []
    acc[groupKey].push(item)
    return acc
  }, {} as Record<PropertyKey, T[]>)
}

function getEmojiForListType(type: ListType): string {
  const emojis: Record<ListType, string> = {
    [ListType.Checklist]: '✅',
    [ListType.Shopping]: '🛒',
    [ListType.Notes]: '📝',
    [ListType.Ideas]: '💡',
    [ListType.Equipment]: '🎒',
    [ListType.CookingPlan]: '🍳',
  }
  return emojis[type] || '📋'
}

export function encodeForUrl(text: string): string {
  return encodeURIComponent(text)
}

// Desktop email clients (Outlook etc.) fail silently on mailto URLs > ~2000 chars
const MAILTO_MAX_LENGTH = 1900

export function generateMailtoLink(
  recipientEmails: string[],
  subject: string,
  body: string,
): { url: string; bodyTruncated: boolean } {
  const validEmails = recipientEmails.map(e => e.trim()).filter(e => e.includes('@'))
  if (validEmails.length === 0) return { url: '', bodyTruncated: false }

  const base = `mailto:${validEmails.join(',')}?subject=${encodeURIComponent(subject)}&body=`
  const encodedBody = encodeURIComponent(body)

  if (base.length + encodedBody.length <= MAILTO_MAX_LENGTH) {
    return { url: base + encodedBody, bodyTruncated: false }
  }

  // Body too long — return URL without body so the caller can handle it
  return { url: base, bodyTruncated: true }
}

export function generateWhatsAppLink(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}
