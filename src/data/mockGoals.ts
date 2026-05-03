import type { Goal } from '../types'

export const mockGoals: Goal[] = [
  {
    id: 'g1',
    title: 'בית מסודר',
    category: 'home',
    progress: 40,
    totalTasks: 5,
    completedTasks: 2,
    createdAt: '2025-05-01T08:00:00Z',
    updatedAt: '2025-05-01T08:00:00Z',
  },
  {
    id: 'g2',
    title: 'למצוא עבודה',
    category: 'work',
    progress: 40,
    totalTasks: 20,
    completedTasks: 8,
    createdAt: '2025-05-01T08:00:00Z',
    updatedAt: '2025-05-01T08:00:00Z',
  },
  {
    id: 'g3',
    title: 'בריאות',
    category: 'health',
    progress: 60,
    totalTasks: 10,
    completedTasks: 6,
    createdAt: '2025-05-01T08:00:00Z',
    updatedAt: '2025-05-01T08:00:00Z',
  },
  {
    id: 'g4',
    title: 'Python',
    category: 'python',
    progress: 58,
    totalTasks: 12,
    completedTasks: 7,
    createdAt: '2025-05-01T08:00:00Z',
    updatedAt: '2025-05-01T08:00:00Z',
  },
]
