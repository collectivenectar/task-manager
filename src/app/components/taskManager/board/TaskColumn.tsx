'use client'

import { Task, TaskStatus, Category } from '@prisma/client'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { PlusIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import TaskCard from '../cards/TaskCard'
import TaskForm from '../forms/TaskForm'
import Modal from '../../common/Modal'
import { useState } from 'react'
import { useCategoryMutations } from '../hooks/useCategoryMutations'
import { useTaskMutations } from '../hooks/useTaskMutations'
import { toast } from 'react-toastify'
import { ValidationError } from '@/lib/errors'

interface TaskColumnProps {
  tasks: (Task & {
    category: {
      id: string
      name: string
      userId: string
      position: number
      isDefault: boolean
      createdAt: Date
      updatedAt: Date
    } | null
  })[]
  onReorder: (taskId: string, beforeId?: string, afterId?: string) => void
  status: TaskStatus | 'ALL'
  userId: string
  categories: Category[]
  onEditTask: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>
}

const getDroppableId = (status: TaskStatus | 'ALL'): string => {
  return status === 'ALL' ? 'ALL_VIEW' : status
}

const isAllStatus = (status: TaskStatus | 'ALL'): status is 'ALL' => status === 'ALL'

const TaskColumn = ({ tasks, onReorder, status, userId, categories, onEditTask, onStatusChange }: TaskColumnProps) => {
  const [isCreating, setIsCreating] = useState(false)
  const [sortBy, setSortBy] = useState<'dueDate' | 'createdAt' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  const { createTaskMutation } = useTaskMutations(userId)
  const { createCategoryMutation } = useCategoryMutations(userId)

  const handleTaskCreate = async (data: {
    title: string
    description?: string | null
    status: TaskStatus
    dueDate?: Date | null
    categoryId: string
  }) => {
    try {
      await createTaskMutation.mutateAsync(data)
      setIsCreating(false)
    } catch (error) {
      if (error instanceof ValidationError) {
        toast.error(error.message)
      } else {
        console.error('Failed to create task:', error)
        toast.error('Failed to create task')
      }
      throw error
    }
  }

  const handleCategoryCreate = async (categoryData: { name: string }) => {
    try {
      const newCategory = await createCategoryMutation.mutateAsync(categoryData)
      return newCategory
    } catch (error) {
      console.error('Failed to create category:', error)
      throw error
    }
  }

  const sortedTasks = status === 'ALL' && sortBy ? [...tasks].sort((a, b) => {
    if (!a[sortBy] && !b[sortBy]) return 0
    if (!a[sortBy]) return 1
    if (!b[sortBy]) return -1
    
    const comparison = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime()
    return sortDirection === 'asc' ? comparison : -comparison
  }) : tasks

  return (
    <>
      <div className={`
        flex flex-col h-[calc(100vh-12rem)] p-4 
        ${status === 'ALL' 
          ? 'opacity-90 bg-surface/20 rounded-lg'
          : 'opacity-90'
        }
      `}>
        <div className="flex flex-col gap-2 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-2xl text-primary rounded-lg p-2">
              {status === 'ALL' ? 'All Tasks' : 
               status === 'TODO' ? 'Todo' :
               status === 'IN_PROGRESS' ? 'In Progress' :
               'Completed'}
            </h2>
            <button
              onClick={() => setIsCreating(true)}
              data-testid={`create-task-button-${status.toLowerCase()}`}
              className="p-3 aspect-square text-black hover:text-primary rounded-lg 
                       bg-white/90 hover:bg-white/15 transition-all"
            >
              <PlusIcon className="h-6 w-6" />
              <span className="sr-only">Add task</span>
            </button>
          </div>

          {status === 'ALL' && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (sortBy === 'dueDate') {
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                  } else {
                    setSortBy('dueDate')
                    setSortDirection('asc')
                  }
                }}
                className={`
                  flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all
                  ${sortBy === 'dueDate' 
                    ? 'bg-white/20 text-primary' 
                    : 'bg-surface/50 text-primary-muted hover:text-primary'
                  }
                `}
              >
                <span>Due Date</span>
                {sortBy === 'dueDate' && (
                  sortDirection === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                )}
              </button>

              <button
                onClick={() => {
                  if (sortBy === 'createdAt') {
                    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                  } else {
                    setSortBy('createdAt')
                    setSortDirection('asc')
                  }
                }}
                className={`
                  flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-all
                  ${sortBy === 'createdAt' 
                    ? 'bg-white/20 text-primary' 
                    : 'bg-surface/50 text-primary-muted hover:text-primary'
                  }
                `}
              >
                <span>Created</span>
                {sortBy === 'createdAt' && (
                  sortDirection === 'asc' ? <ArrowUpIcon className="h-4 w-4" /> : <ArrowDownIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>

        <Droppable droppableId={getDroppableId(status)}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 overflow-y-auto min-h-[100px] space-y-3 
                       scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                       px-2 w-full max-h-full
                       md:mx-auto md:max-w-2xl lg:max-w-3xl"
            >
              {sortedTasks.map((task, index) => (
                status === 'ALL' ? (
                  <div key={task.id} className="opacity-90">
                    <TaskCard
                      task={task}
                      userId={userId}
                      onEdit={onEditTask}
                      onStatusChange={onStatusChange}
                      isAllView={isAllStatus(status)}
                    />
                  </div>
                ) : (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="transform transition-transform"
                        style={provided.draggableProps.style}
                      >
                        <TaskCard
                          task={task}
                          userId={userId}
                          isDragging={snapshot.isDragging}
                          dragHandleProps={provided.dragHandleProps}
                          onEdit={onEditTask}
                          onStatusChange={onStatusChange}
                          isAllView={isAllStatus(status)}
                        />
                      </div>
                    )}
                  </Draggable>
                )
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>

      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title={`Add Task to ${status.toLowerCase().replace('_', ' ')}`}
      >
        <TaskForm
          userId={userId}
          categories={categories}
          onSubmit={handleTaskCreate}
          onCancel={() => setIsCreating(false)}
          onCategoryCreate={handleCategoryCreate}
        />
      </Modal>
    </>
  )
}

export default TaskColumn
