'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, moveTask, getCategories, updateTask, updateTaskStatus, createCategory } from '@/app/actions'
import { Task, TaskStatus } from '@prisma/client'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'

import TaskColumn from './TaskColumn'
import Modal from '../common/Modal'
import TaskForm from './TaskForm'

interface TaskBoardProps {
  initialTasks: Task[]
  userId: string
}

const taskStatuses = [
  { id: 'TODO', icon: '📋', label: 'To Do' },
  { id: 'IN_PROGRESS', icon: '🔄', label: 'In Progress' },
  { id: 'COMPLETED', icon: '✅', label: 'Completed' }
] as const

const TaskBoard = ({ initialTasks, userId }: TaskBoardProps) => {
  const [activeStatus, setActiveStatus] = useState<TaskStatus>('TODO')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const queryClient = useQueryClient()

  // Query for tasks with initial data
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(userId),
    initialData: initialTasks,
    select: (data) => data.map(task => ({
      ...task,
      category: categories?.find(c => c.id === task.categoryId) || null
    }))
  })

  // Query for categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(userId),
  })

  // Mutation for reordering tasks
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

        // Update the cache with new positions
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

  // Add this mutation
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

  // Add this mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: (params: { taskId: string, status: TaskStatus }) => 
      updateTaskStatus(userId, params.taskId, params.status),
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      
      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      // Optimistically update to the new value
      queryClient.setQueryData(['tasks'], (old: Task[] | undefined) => {
        if (!old) return old
        return old.map(task => 
          task.id === taskId ? { ...task, status } : task
        )
      })

      return { previousTasks }
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['tasks'], context?.previousTasks)
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const handleReorder = (taskId: string, beforeId?: string, afterId?: string) => {
    reorderMutation.mutate({ 
      taskId, 
      beforeId: beforeId || '', 
      afterId: afterId || '' 
    })
  }

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, source, destination } = result;
    
    // Get tasks in destination column
    const columnTasks = tasks?.filter(task => task.status === destination.droppableId) || [];
    
    // Remove the dragged task from the array before calculating before/after
    const tasksWithoutDragged = columnTasks.filter(task => task.id !== draggableId);
    
    // Find tasks before and after drop position
    const beforeTask = destination.index > 0 ? tasksWithoutDragged[destination.index - 1] : null;
    const afterTask = destination.index < tasksWithoutDragged.length ? tasksWithoutDragged[destination.index] : null;
    
    try {
      await reorderMutation.mutateAsync({
        taskId: draggableId,
        beforeId: beforeTask?.id || '',
        afterId: afterTask?.id || ''
      });
    } catch (error) {
      console.error('Reorder mutation failed with:', error);
    }
  };

  // Pass this to TaskColumn
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    await updateTaskStatusMutation.mutateAsync({ taskId, status: newStatus })
  }

  // Pass this to TaskForm
  const handleCategoryCreate = async (categoryData: { name: string }) => {
    try {
      const newCategory = await createCategory(userId, categoryData)
      // Invalidate categories query to refetch the list
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      return newCategory
    } catch (error) {
      console.error('Failed to create category:', error)
      throw error
    }
  }

  return (
    <>
      <div className="flex flex-col h-full max-w-7xl mx-auto px-4 py-6">
        {/* Status Icons Row */}
        <div className="flex justify-center gap-4 sm:gap-8 mb-6">
          {taskStatuses.map(status => (
            <button
              key={status.id}
              onClick={() => setActiveStatus(status.id)}
              className={`
                p-3 rounded-lg transition-colors duration-200
                flex flex-col items-center gap-1
                ${activeStatus === status.id 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }
              `}
            >
              <span className="text-2xl">{status.icon}</span>
              <span className="text-xs font-medium hidden sm:block">{status.label}</span>
            </button>
          ))}
        </div>

        {/* Wrap the TaskColumn in DragDropContext */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0">
            <TaskColumn
              categories={categories ?? []}
              tasks={tasks?.filter(task => task.status === activeStatus) ?? []}
              onReorder={handleReorder}
              status={activeStatus}
              userId={userId}
              onEditTask={setEditingTask}
              onStatusChange={handleStatusChange}
            />
          </div>
        </DragDropContext>
      </div>

      {/* Move Modal here */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        title="Edit Task"
      >
        {editingTask && (
          <TaskForm
            initialData={editingTask}
            categories={categories ?? []}
            userId={userId}
            onSubmit={async (data) => {
              try {
                await updateTaskMutation.mutateAsync({
                  taskId: editingTask.id,
                  data
                })
                setEditingTask(null)
              } catch (error) {
                console.error('Failed to update task:', error)
              }
            }}
            onCancel={() => setEditingTask(null)}
            onCategoryCreate={handleCategoryCreate}
          />
        )}
      </Modal>
    </>
  )
}

export default TaskBoard