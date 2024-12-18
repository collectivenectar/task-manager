'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, moveTask, getCategories, updateTask, updateTaskStatus, createCategory, deleteTask } from '@/app/actions'
import { Task, TaskStatus } from '@prisma/client'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Popover } from '@headlessui/react'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'

import TaskColumn from './TaskColumn'
import Modal from '../common/Modal'
import TaskForm from './TaskForm'
import { alerts } from '@/lib/utils/alerts'

interface TaskBoardProps {
  initialTasks: Task[]
  userId: string
}

const taskStatuses = [
  { id: 'ALL', label: 'all' },
  { id: 'TODO', label: 'todo' },
  { id: 'IN_PROGRESS', label: 'in progress' },
  { id: 'COMPLETED', label: 'completed' }
] as const

const TaskBoard = ({ initialTasks, userId }: TaskBoardProps) => {
  // 1. All useState hooks first
  const [activeStatus, setActiveStatus] = useState<TaskStatus | 'ALL'>('ALL')
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 2. All useRef hooks
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  // 3. Get queryClient
  const queryClient = useQueryClient()

  // 4. All queries
  const { data: categories, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(userId),
  })

  const { data: tasks } = useQuery({
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

  // 5. All mutations
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

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => deleteTask(userId, taskId),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] })
      const previousTasks = queryClient.getQueryData(['tasks'])
      
      // Optimistic update
      queryClient.setQueryData(['tasks'], (old: Task[] | undefined) => {
        if (!old) return old
        return old.filter(task => task.id !== taskId)
      })

      alerts.info('Deleting task...')  // Show pending state
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

  // 6. Loading state check
  if (isCategoriesLoading) {
    return <div>Loading...</div>
  }

  // 7. Error state check
  if (!categories?.some(c => c.isDefault)) {
    return <div>Error: No default category found</div>
  }

  // Rest of the component logic...
  const closePopover = () => {
    filterButtonRef.current?.click()
  }

  // Count active filters for the indicator
  const activeFiltersCount = activeCategories.size + (activeStatus !== 'ALL' ? 1 : 0)

  // Helper to close the popover
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

  // Filter tasks based on both status and categories
  const filteredTasks = tasks?.filter(task => {
    const matchesStatus = activeStatus === 'ALL' || task.status === activeStatus
    const matchesCategory = activeCategories.size === 0 || activeCategories.has(task.categoryId)
    const matchesSearch = searchQuery === '' || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    
    return matchesStatus && matchesCategory && matchesSearch
  }) ?? []

  return (
    <>
      <div className="flex flex-col h-full max-w-7xl mx-auto px-2 py-8">

        {/* Search and Filter Bar */}
        <div className="flex justify-left mb-8">
          <div className="flex gap-4 w-full md:w-[640px]">
            <div className="flex-1 flex gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-muted" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-surface border border-white/10 rounded-lg
                            text-primary placeholder:text-primary-muted
                            focus:outline-none focus:ring-2 focus:ring-white/20
                            transition-all duration-200"
                />
              </div>

              <Popover className="relative">
                {({ open }) => (
                  <>
                    <Popover.Button
                      ref={filterButtonRef}
                      className={`
                        h-10 aspect-square rounded-lg transition-all duration-200
                        flex items-center justify-center
                        ${open 
                          ? 'bg-white/20 text-white' 
                          : 'bg-surface border border-white/10 text-primary-muted hover:text-primary hover:border-white/20'
                        }
                      `}
                    >
                      <FunnelIcon className="h-5 w-5" />
                      {activeCategories.size > 0 && (
                        <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white/90 text-black text-xs flex items-center justify-center">
                          {activeCategories.size}
                        </span>
                      )}
                    </Popover.Button>

                    <Popover.Panel className="absolute right-0 mt-2 w-80 z-10">
                      <div className="bg-surface border border-white/10 rounded-lg p-4 shadow-xl">
                        {/* Category filter section */}
                        <div>
                          <h3 className="text-sm font-medium text-primary-muted mb-2 flex justify-between items-center">
                            <span>Category</span>
                            {activeCategories.size > 0 && (
                              <button
                                onClick={() => {
                                  setActiveCategories(new Set())
                                  closePopover()
                                }}
                                className="text-xs text-white hover:text-white/80"
                              >
                                Clear all
                              </button>
                            )}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {categories?.map(category => (
                              <button
                                key={category.id}
                                onClick={() => {
                                  setActiveCategories(prev => {
                                    const next = new Set(prev)
                                    if (next.has(category.id)) {
                                      next.delete(category.id)
                                    } else {
                                      next.add(category.id)
                                    }
                                    return next
                                  })
                                }}
                                className={`
                                  px-4 py-1.5 rounded-lg text-sm transition-all duration-200
                                  ${activeCategories.has(category.id)
                                    ? 'bg-white/90 text-black border border-white/20' 
                                    : 'bg-surface border border-white/10 text-primary-muted hover:text-primary hover:border-white/20'
                                  }
                                `}
                              >
                                {category.name.toLowerCase()}
                                {category.isDefault && ' (default)'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Done button for multi-select */}
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={closePopover}
                            className="px-4 py-2 bg-white/90 text-black rounded-lg text-sm hover:bg-white/80 transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </Popover.Panel>
                  </>
                )}
              </Popover>
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="mb-6 border-b border-white/10 overflow-x-auto">
          <div className="max-w-2xl px-4">
            <div className="flex gap-2 min-w-max">
              {taskStatuses.map(status => (
                <button
                  key={status.id}
                  onClick={() => setActiveStatus(status.id)}
                  className={`
                    px-4 py-2 text-sm transition-all duration-200 relative
                    ${activeStatus === status.id 
                      ? 'text-primary bg-white/20 rounded-t-lg' 
                      : 'text-primary-muted hover:text-primary rounded-lg p-2'
                    }
                    ${activeStatus === status.id && 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white/20'}
                  `}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Task Column */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0 bg-surface/50 backdrop-blur-lg rounded-xl border border-white/10">
            <TaskColumn
              categories={categories ?? []}
              tasks={filteredTasks}
              onReorder={handleReorder}
              status={activeStatus}
              userId={userId}
              onEditTask={setEditingTask}
              onStatusChange={handleStatusChange}
            />
          </div>
        </DragDropContext>
      </div>

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
                alerts.info('Updating task...')  // Show pending state
                await updateTaskMutation.mutateAsync({
                  taskId: editingTask.id,
                  data
                })
                setEditingTask(null)
                alerts.success('Task updated successfully')  // Show success
              } catch (error) {
                console.error('Failed to update task:', error)
                alerts.error('Failed to update task')  // Show error
              }
            }}
            onCancel={() => setEditingTask(null)}
            onCategoryCreate={handleCategoryCreate}
            onDelete={async (taskId) => {
              try {
                await deleteTaskMutation.mutateAsync(taskId)
                setEditingTask(null)
              } catch (error) {
                console.error('Failed to delete task:', error)
              }
            }}
          />
        )}
      </Modal>
    </>
  )
}

export default TaskBoard