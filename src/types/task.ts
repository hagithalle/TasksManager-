export type Priority = 'low' | 'medium' | 'high' | 'critical'
export type ExecutionTime = 'short' | 'medium' | 'long' // <2 min, <10 min, 10+ min

export interface Task {
  id: string
  title: string
  completed: boolean
  priority: Priority
  executionTime?: ExecutionTime
  dueDate?: string       // ISO date string
  goalId?: string        // parent goal
  listId?: string        // parent list
  subTasks?: SubTask[]
  createdAt: string
  updatedAt: string
}

export interface SubTask {
  id: string
  title: string
  completed: boolean
}
