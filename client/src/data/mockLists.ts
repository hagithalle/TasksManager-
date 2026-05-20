import type { PersonalList } from '../types'
import { ListType } from '../types/enums'

export const mockLists: PersonalList[] = [
  {
    id: 'l1',
    title: 'רשימת קניות',
    emoji: '🛒',
    listType: ListType.Checklist,
    shoppingItems: [],
    items: [
      { id: 'li1',  title: 'חלב',         isCompleted: false, sortOrder: 1 },
      { id: 'li2',  title: 'לחם',         isCompleted: false, sortOrder: 2 },
      { id: 'li3',  title: 'ביצים',       isCompleted: true,  sortOrder: 3 },
      { id: 'li4',  title: 'גבינה צהובה', isCompleted: false, sortOrder: 4 },
      { id: 'li5',  title: 'עגבניות',     isCompleted: false, sortOrder: 5 },
      { id: 'li6',  title: 'מלפפונים',    isCompleted: false, sortOrder: 6 },
      { id: 'li7',  title: 'שמן זית',     isCompleted: true,  sortOrder: 7 },
      { id: 'li8',  title: 'קפה',         isCompleted: false, sortOrder: 8 },
    ],
    createdAt: '2025-05-01T08:00:00Z',
    updatedAt: '2025-05-01T08:00:00Z',
  },
  {
    id: 'l2',
    title: "צ'ק ליסט לטיסה",
    emoji: '✈️',
    listType: ListType.Checklist,
    shoppingItems: [],
    items: [
      { id: 'li9',  title: 'דרכון',          isCompleted: true,  sortOrder: 1 },
      { id: 'li10', title: 'כרטיס טיסה',     isCompleted: true,  sortOrder: 2 },
      { id: 'li11', title: 'ביטוח נסיעות',   isCompleted: false, sortOrder: 3 },
      { id: 'li12', title: 'מטען יד',        isCompleted: false, sortOrder: 4 },
      { id: 'li13', title: 'מטען גדול',      isCompleted: false, sortOrder: 5 },
      { id: 'li14', title: 'מטען לטלפון',    isCompleted: false, sortOrder: 6 },
      { id: 'li15', title: 'מגבת',           isCompleted: false, sortOrder: 7 },
      { id: 'li16', title: 'תרופות',         isCompleted: true,  sortOrder: 8 },
      { id: 'li17', title: 'קרם הגנה',       isCompleted: false, sortOrder: 9 },
      { id: 'li18', title: 'ספר לדרך',       isCompleted: false, sortOrder: 10 },
    ],
    createdAt: '2025-05-01T08:00:00Z',
    updatedAt: '2025-05-01T08:00:00Z',
  },
  {
    id: 'l3',
    title: 'ספרים לקרוא',
    emoji: '📚',
    listType: ListType.Checklist,
    shoppingItems: [],
    items: [
      { id: 'li19', title: 'Atomic Habits',           isCompleted: true,  sortOrder: 1 },
      { id: 'li20', title: 'The Pragmatic Programmer', isCompleted: false, sortOrder: 2 },
      { id: 'li21', title: 'Clean Code',               isCompleted: false, sortOrder: 3 },
      { id: 'li22', title: 'Deep Work',                isCompleted: false, sortOrder: 4 },
      { id: 'li23', title: 'The Power of Habit',       isCompleted: false, sortOrder: 5 },
    ],
    createdAt: '2025-05-01T08:00:00Z',
    updatedAt: '2025-05-01T08:00:00Z',
  },
]

