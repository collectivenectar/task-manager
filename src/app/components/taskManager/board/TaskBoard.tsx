'use client'

import { useState, useRef } from 'react'
import { Task, TaskStatus } from '@prisma/client'
import { DragDropContext, DropResult } from '@hello-pangea/dnd'
import { Popover } from '@headlessui/react'
import { MagnifyingGlassIcon, FunnelIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-toastify'

import TaskColumn from './TaskColumn'
import Modal from '../../common/Modal'
import TaskForm from '../forms/TaskForm'
import { alerts } from '@/lib/utils/alerts'
import { ValidationError } from '@/lib/errors'
import { useTaskMutations } from '../hooks/useTaskMutations'
import { useTaskQueries } from '../hooks/useTaskQueries'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import TaskBoardSkeleton from './TaskBoardSkeleton'

interface TaskBoardProps {
  initialTasks: Task[]
  userId: string
}

const taskStatuses = [
  { id: 'ALL', label: 'all', isActionable: false },
  { id: 'TODO', label: 'todo', isActionable: true },
  { id: 'IN_PROGRESS', label: 'in progress', isActionable: true },
  { id: 'COMPLETED', label: 'completed', isActionable: true }
] as const

/**
 * Performance Considerations:
 * 
 * 1. Task Positioning
 *    - Using float positions with 1000-unit gaps allows 2^53 operations
 *    - Rebalancing triggered when gaps < 1 unit
 *    - O(n) rebalancing cost amortized over n operations
 * 
 * 2. Query Optimization
 *    - Categories cached client-side
 *    - Tasks fetched with category data in single query
 *    - Position updates use optimistic UI updates
 * 
 * 3. Future Scaling
 *    - Consider pagination for large task lists
 *    - Could implement virtual scrolling if needed
 *    - Category deletion could be async for large task sets
 */

const TaskBoard = ({ initialTasks, userId }: TaskBoardProps) => {
  // 1. All useState hooks first
  const [activeStatus, setActiveStatus] = useState<TaskStatus | 'ALL'>('ALL')
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set())
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // 2. All useRef hooks
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  // 3. Get queryClient
  // const queryClient = useQueryClient()

  // 4. All queries
  const {
    tasks,
    categories,
    isLoading,
    error,
    hasDefaultCategory
  } = useTaskQueries({ 
    userId, 
    initialTasks 
  })

  // 5. All mutations
  const {
    reorderMutation,
    updateTaskMutation,
    updateTaskStatusMutation,
    deleteTaskMutation
  } = useTaskMutations(userId)

  const { createCategoryMutation } = useCategoryMutations(userId)

  // 6. Loading state check
  if (isLoading) {
    return <TaskBoardSkeleton />
  }

  // 7. Error state check
  if (!hasDefaultCategory) {
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

    const { draggableId, destination } = result;
    const columnTasks = tasks?.filter(task => task.status === destination.droppableId) || [];
    const tasksWithoutDragged = columnTasks.filter(task => task.id !== draggableId);
    
    const beforeTask = destination.index > 0 ? tasksWithoutDragged[destination.index - 1] : null;
    const afterTask = destination.index < tasksWithoutDragged.length ? tasksWithoutDragged[destination.index] : null;
    
    try {
      await reorderMutation.mutateAsync({
        taskId: draggableId,
        beforeId: beforeTask?.id || '',
        afterId: afterTask?.id || ''
      });
    } catch (error) {
      console.error('Reorder mutation failed:', error);
    }
  };

  // Pass this to TaskColumn
  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatusMutation.mutateAsync({ taskId, status: newStatus })
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message)
      } else {
        console.error('Failed to update status:', error)
        toast.error('Failed to update status')
      }
    }
  }

  // Pass this to TaskForm
  const handleCategoryCreate = async (categoryData: { name: string }) => {
    try {
      return await createCategoryMutation.mutateAsync(categoryData)
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

  const toggleCategory = (categoryId: string) => {
    const newCategories = new Set(activeCategories)
    if (newCategories.has(categoryId)) {
      newCategories.delete(categoryId)
    } else {
      newCategories.add(categoryId)
    }
    setActiveCategories(newCategories)
  }

  return (
    <>
      <div className="flex flex-col h-full mx-auto px-2 py-8">
        <div className="w-full md:mx-auto md:w-[768px] lg:w-[896px]">
          <div className="flex justify-left mb-4" data-testid="task-controls">
            <div className="flex gap-4 w-full">
              <div className="flex-1 flex gap-2 min-w-0">
                <div className="relative flex-1 min-w-0">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-muted" />
                  <input
                    type="text"
                    data-testid="task-search-input"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 bg-surface border border-white/10 rounded-lg
                              text-primary placeholder:text-primary-muted
                              focus:outline-none focus:ring-2 focus:ring-white/20
                              transition-all duration-200"
                  />
                </div>

                <Popover className="relative" data-testid="category-filter">
                  {({ open }) => (
                    <>
                      <Popover.Button
                        ref={filterButtonRef}
                        type="button"
                        data-testid="category-filter-button"
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
                          <span 
                            data-testid="category-filter-count"
                            className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-white/90 text-black text-xs flex items-center justify-center"
                          >
                            {activeCategories.size}
                          </span>
                        )}
                      </Popover.Button>

                      <Popover.Panel className="absolute right-0 mt-2 w-80 z-10">
                        <div className="bg-surface border border-white/10 rounded-lg p-4 shadow-xl">
                          <div className="flex flex-wrap gap-2" data-testid="category-filter-list">
                            {categories?.map(category => (
                              <button
                                key={category.id}
                                onClick={() => toggleCategory(category.id)}
                                data-testid={`category-filter-item-${category.id}`}
                                className={`
                                  px-3 py-1.5 text-sm rounded-lg transition-all duration-200
                                  ${activeCategories.has(category.id)
                                    ? 'bg-white/20 text-primary border border-white/20'
                                    : 'bg-surface border border-white/10 text-primary-muted hover:text-primary hover:border-white/20'
                                  }
                                `}
                              >
                                {category.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </Popover.Panel>
                    </>
                  )}
                </Popover>
              </div>
            </div>
          </div>

          <div className={`
            mt-1 mb-6 flex flex-wrap gap-2
            transition-all duration-200
            ${(activeCategories.size > 0 || searchQuery) ? 'min-h-[2rem] py-1 opacity-100' : 'min-h-0 h-0 opacity-0 overflow-hidden'}
          `}>
            {searchQuery && (
              <div className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/10 text-primary">
                <span>"{searchQuery}"</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-primary-muted hover:text-primary"
                >
                  <XMarkIcon className="h-4 w-4" />
                  <span className="sr-only">Clear search</span>
                </button>
              </div>
            )}
            
            {Array.from(activeCategories).map(categoryId => {
              const category = categories?.find(c => c.id === categoryId)
              if (!category) return null
              
              return (
                <div 
                  key={categoryId}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-white/10 text-primary"
                >
                  <span>{category.name}</span>
                  <button
                    onClick={() => toggleCategory(categoryId)}
                    className="text-primary-muted hover:text-primary"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span className="sr-only">Remove {category.name} filter</span>
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mb-6 flex justify-between items-center">
            <div>
              <button
                key="ALL"
                type="button"
                data-testid="status-tab-all"
                onClick={(e) => {
                  e.preventDefault()
                  setActiveStatus('ALL')
                }}
                className={`
                  px-4 py-2 text-sm transition-all duration-200
                  rounded-lg border
                  ${activeStatus === 'ALL' 
                    ? 'text-primary bg-white/20 border-white/20' 
                    : 'text-primary-muted hover:text-primary border-white/10 bg-white/5 hover:border-white/20'
                  }
                `}
              >
                all tasks
              </button>
            </div>

            <div className="flex bg-surface/50 rounded-lg border border-white/10 p-0.5">
              {taskStatuses
                .filter(status => status.isActionable)
                .map(({ id, label }, index, array) => (
                  <button
                    key={id}
                    type="button"
                    data-testid={`status-tab-${id.toLowerCase()}`}
                    onClick={(e) => {
                      e.preventDefault()
                      setActiveStatus(id as TaskStatus | 'ALL')
                    }}
                    className={`
                      px-4 py-2 text-sm transition-all duration-200
                      ${index === 0 ? 'rounded-l-lg' : ''}
                      ${index === array.length - 1 ? 'rounded-r-lg' : ''}
                      ${activeStatus === id 
                        ? 'text-primary bg-white/20' 
                        : 'text-primary-muted hover:text-primary'
                      }
                    `}
                  >
                    {label}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <div 
            data-testid="task-board"
            className="flex-1 min-h-0 bg-surface/50 backdrop-blur-lg rounded-xl border border-white/10
                      md:mx-auto md:w-[768px] lg:w-[896px]"
          >
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
        data-testid="edit-task-modal"
      >
        {editingTask && (
          <TaskForm
            initialData={editingTask}
            categories={categories ?? []}
            userId={userId}
            onSubmit={async (data) => {
              try {
                alerts.info('Updating task...')
                await updateTaskMutation.mutateAsync({
                  taskId: editingTask.id,
                  data
                })
                setEditingTask(null)
                alerts.success('Task updated successfully')
              } catch (error) {
                console.error('Failed to update task:', error)
                alerts.error('Failed to update task')
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