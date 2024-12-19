import { useMutation, useQueryClient } from '@tanstack/react-query'
import { moveTask, updateTask, updateTaskStatus, deleteTask, createTask } from '@/app/actions'
import { Task, TaskStatus } from '@prisma/client'
import { alerts } from '@/lib/utils/alerts'

/**
 * Custom hook for managing task-related mutations
 * @param userId - The ID of the user performing the mutations
 * @returns Object containing mutation functions for task operations
 */
export function useTaskMutations(userId: string) {
  const queryClient = useQueryClient()
  
  /**
   * Mutation for reordering tasks
   * Handles optimistic updates and rollbacks on failure
   * Updates task positions based on drag and drop operations
   * @internal
   */
  const reorderMutation = useMutation({
    mutationFn: (params: { taskId: string, beforeId: string, afterId: string }) => 
      moveTask(userId, params.taskId, { 
        beforeId: params.beforeId || undefined, 
        afterId: params.afterId || undefined 
      }),
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData(['tasks']) as Task[]
      
      // Calculate optimistic position
      const draggedTask = previousTasks.find(t => t.id === newTask.taskId)
      const beforeTask = previousTasks.find(t => t.id === newTask.beforeId)
      const afterTask = previousTasks.find(t => t.id === newTask.afterId)
      
      if (draggedTask) {
        const newPosition = beforeTask && afterTask
          ? (beforeTask.position + afterTask.position) / 2
          : beforeTask
          ? beforeTask.position + 1000
          : afterTask
          ? afterTask.position - 1000
          : 0

        queryClient.setQueryData(['tasks'], (old: Task[] | undefined) => {
          if (!old) return old
          return [...old].map(task => 
            task.id === draggedTask.id
              ? { ...task, position: newPosition }
              : task
          ).sort((a, b) => a.position - b.position)
        })
      }

      return { previousTasks }
    },
    onError: (err, newTask, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  /**
   * Mutation for creating new tasks
   * Validates and creates a task with the given properties
   * Automatically invalidates task queries on success
   * @internal
   */
  const createTaskMutation = useMutation({
    mutationFn: (data: {
      title: string
      description?: string | null
      status: TaskStatus
      dueDate?: Date | null
      categoryId: string
    }) => createTask(userId, {
      ...data,
      description: data.description || undefined  // Convert null to undefined
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  /**
   * Mutation for updating existing tasks
   * Handles partial updates of task properties
   * Automatically invalidates task queries on success
   * @internal
   */
  const updateTaskMutation = useMutation({
    mutationFn: (params: { 
      taskId: string, 
      data: {
        title?: string
        description?: string | null
        status?: TaskStatus
        dueDate?: Date | null
        categoryId?: string
      }
    }) => updateTask(userId, params.taskId, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  /**
   * Mutation for updating task status
   * Provides optimistic updates for immediate UI feedback
   * Rolls back on failure
   * @internal
   */
  const updateTaskStatusMutation = useMutation({
    mutationFn: (params: { taskId: string, status: TaskStatus }) => 
      updateTaskStatus(userId, params.taskId, params.status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      queryClient.setQueryData(['tasks'], (old: Task[] | undefined) => {
        if (!old) return old
        return old.map(task => 
          task.id === taskId ? { ...task, status } : task
        )
      })

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  /**
   * Mutation for deleting tasks
   * Provides optimistic updates and user feedback via alerts
   * Rolls back on failure
   * @internal
   */
  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(userId, taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      queryClient.setQueryData(['tasks'], (old: Task[] | undefined) => {
        if (!old) return old
        return old.filter(task => task.id !== taskId)
      })

      alerts.info('Deleting task...')
      return { previousTasks }
    },
    onSuccess: () => {
      alerts.success('Task deleted successfully')
    },
    onError: (err, taskId, context) => {
      queryClient.setQueryData(['tasks'], context?.previousTasks)
      alerts.error('Failed to delete task')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  return {
    reorderMutation,
    updateTaskMutation,
    updateTaskStatusMutation,
    deleteTaskMutation,
    createTaskMutation
  }
} 