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

interface TaskColumnProps {
  tasks: (Task & {
    category: Category | null
  })[]
  onReorder: (taskId: string, beforeId?: string, afterId?: string) => void
  status: TaskStatus
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
      await createTask(userId, {
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
      throw error
    }
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gray-50 rounded-lg p-4 gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {status === 'TODO' && 'To Do'}
            {status === 'IN_PROGRESS' && 'In Progress'}
            {status === 'COMPLETED' && 'Completed'}
          </h2>
          <button
            onClick={() => setIsCreating(true)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            <span className="sr-only">Add task</span>
          </button>
        </div>

        <Droppable droppableId={status}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex-1 overflow-y-auto min-h-[100px] space-y-2"
            >
              {tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="transform transition-transform"
                      style={{
                        ...provided.draggableProps.style,
                      }}
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
