'use client'

import { Task, TaskStatus, Category } from '@prisma/client'
import { Droppable, Draggable } from '@hello-pangea/dnd'
import { PlusIcon } from '@heroicons/react/24/outline'
import TaskCard from './TaskCard'
import TaskForm from './TaskForm'
import Modal from '../common/Modal'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createTask, createCategory } from '@/app/actions'
import { toast } from 'react-toastify'

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

const TaskColumn = ({ tasks, onReorder, status, userId, categories, onEditTask, onStatusChange }: TaskColumnProps) => {
  const [isCreating, setIsCreating] = useState(false)
  const queryClient = useQueryClient()

  const handleTaskCreate = async (data: {
    title: string
    description?: string | null
    status: TaskStatus
    dueDate?: Date | null
    categoryId: string
  }) => {
    try {
      const newTask = await createTask(userId, {
        title: data.title,
        description: data.description,
        status: data.status,
        dueDate: data.dueDate,
        categoryId: data.categoryId
      })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setIsCreating(false)
    } catch (error) {
      console.error('Failed to create task:', error)
      toast.error('Failed to create task, something went wrong')
      throw error
    }
  }

  return (
    <>
      <div className="flex flex-col h-full p-4 opacity-90">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-2xl text-primary rounded-lg p-2">
            {status === 'ALL' && 'All Tasks'}
            {status === 'TODO' && 'To Do'}
            {status === 'IN_PROGRESS' && 'In Progress'}
            {status === 'COMPLETED' && 'Completed'}
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            className="p-3 aspect-square text-black hover:text-primary rounded-lg 
                     bg-white/90 hover:bg-white/15 transition-all"
          >
            <PlusIcon className="h-6 w-6" />
            <span className="sr-only">Add task</span>
          </button>
        </div>

        <Droppable droppableId={status}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 overflow-y-auto min-h-[100px] space-y-3 
                       scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent
                       pr-2"
            >
              {tasks.map((task, index) => (
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
                        onEdit={onEditTask}
                        onStatusChange={onStatusChange}
                      />
                    </div>
                  )}
                </Draggable>
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
          onCategoryCreate={async (data) => {
            const newCategory = await createCategory(userId, data)
            queryClient.invalidateQueries({ queryKey: ['categories'] })
            return newCategory
          }}
        />
      </Modal>
    </>
  )
}

export default TaskColumn
