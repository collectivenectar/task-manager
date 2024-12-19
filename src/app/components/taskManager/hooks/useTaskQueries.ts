import { useQuery } from '@tanstack/react-query'
import { getTasks, getCategories } from '@/app/actions'
import { Task, Category } from '@prisma/client'

interface UseTaskQueriesProps {
  userId: string
  initialTasks?: Task[]
}

export function useTaskQueries({ userId, initialTasks }: UseTaskQueriesProps) {
  const { 
    data: categories,
    isLoading: isCategoriesLoading 
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(userId),
  })

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
    tasks,
    categories,
    isLoading: isTasksLoading || isCategoriesLoading,
    error: tasksError,
    hasDefaultCategory: categories?.some(c => c.isDefault) ?? false
  }
} 