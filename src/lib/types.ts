import { Task, Category, TaskStatus } from '@prisma/client'
import { UseMutationResult } from '@tanstack/react-query'

export type DeleteMode = 'delete_all' | 'move'

export interface DragHandleProps {
  'aria-describedby'?: string
  'aria-labelledby'?: string
  draggable: boolean
  role?: string
  tabIndex: number
  onDragStart: (event: React.DragEvent) => void
  onDragEnd: (event: React.DragEvent) => void
}

export interface UseTaskQueriesResult {
  tasks: (Task & { category: Category | null })[]
  categories: Category[] | undefined
  isLoading: boolean
  error: Error | null
  hasDefaultCategory: boolean
}

export interface UseTaskMutationsResult {
  reorderMutation: UseMutationResult
  updateTaskMutation: UseMutationResult
  updateTaskStatusMutation: UseMutationResult
  deleteTaskMutation: UseMutationResult
  createTaskMutation: UseMutationResult
} 