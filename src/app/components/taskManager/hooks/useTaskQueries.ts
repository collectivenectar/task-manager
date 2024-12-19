import { useQuery } from '@tanstack/react-query'
import { getTasks, getCategories } from '@/app/actions'
import { Task } from '@prisma/client'
import { UseTaskQueriesResult } from '@/lib/types'

interface UseTaskQueriesProps {
  userId: string
  initialTasks?: Task[]
}

/**
 * Custom hook for managing task and category queries
 * @param props - Object containing userId and optional initial tasks
 * @returns Object containing tasks, categories, loading states and error states
 */
export function useTaskQueries({ userId, initialTasks }: UseTaskQueriesProps): UseTaskQueriesResult {
  /**
   * Query for fetching categories
   * Includes tasks relationship for each category
   * Updates default category names if needed
   * @internal
   */
  const { 
    data: categories,
    isLoading: isCategoriesLoading 
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(userId),
  })

  /**
   * Query for fetching tasks
   * Maps category relationships to each task
   * Supports initial data for SSR
   * @internal
   */
  const { 
    data: tasks,
    isLoading: isTasksLoading,
    error: tasksError
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(userId),
    initialData: initialTasks,
    select: (data) => data.map(task => {
      const category = categories?.find(c => c.id === task.categoryId)
      return {
        ...task,
        category: category || null
      }
    })
  })

  return {
    tasks: tasks || [],
    categories,
    isLoading: isTasksLoading || isCategoriesLoading,
    error: tasksError,
    hasDefaultCategory: categories?.some(c => c.isDefault) ?? false
  }
} 