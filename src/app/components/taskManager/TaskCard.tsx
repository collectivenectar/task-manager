'use client'

import { Task, TaskStatus, Category } from '@prisma/client'
import { useState, useEffect, useRef } from 'react'
import { PencilIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface TaskCardProps {
  task: Task & {
    category: Category | null
  }
  isDragging?: boolean
  dragHandleProps?: any
  userId: string
  onEdit: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>
}

const TaskCard = ({ task, isDragging, dragHandleProps, userId, onEdit, onStatusChange }: TaskCardProps) => {
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const getNextStatus = (currentStatus: TaskStatus = task.status): TaskStatus => {
    const statusFlow = {
      'TODO': 'IN_PROGRESS',
      'IN_PROGRESS': 'COMPLETED',
      'COMPLETED': 'TODO'
    } as const
    return statusFlow[currentStatus]
  }

  const handleStatusClick = () => {
    // Allow clicking while timer is running
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      setIsAnimating(false)
    }
    
    const nextStatus = getNextStatus(pendingStatus || task.status)
    setPendingStatus(nextStatus)
    setIsAnimating(true)

    // Start a new timer
    timerRef.current = setTimeout(async () => {
      try {
        setIsAnimating(false)  // Stop animation before API call
        await onStatusChange(task.id, nextStatus)
      } catch (error) {
        console.error('Failed to update status:', error)
        setPendingStatus(null)  // Reset on error
      }
    }, 2000)
  }

  // Cleanup timer on unmount or status change
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const getTimeUntilDue = (dueDate: Date): string => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    return `Due in ${diffDays} days`
  }

  return (
    <div
      className={`
        group bg-white rounded-lg border border-gray-200
        ${isDragging ? 'opacity-50 shadow-lg' : 'hover:shadow-md'}
        transition-all duration-200
      `}
      {...dragHandleProps}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-sm font-medium text-gray-900 break-words flex-1">
            {task.title}
          </h3>
          <button
            onClick={() => onEdit(task)}
            className="shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded
                     opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
        </div>

        {task.description && (
          <p className="mt-2 text-sm text-gray-500 truncate">
            {task.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {task.category && (
            <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
              {task.category.name}
            </span>
          )}
          
          <div className="relative inline-flex items-center">
            <button
              onClick={handleStatusClick}
              disabled={!isAnimating && pendingStatus !== null && pendingStatus !== task.status}
              className={`
                px-2 py-1 text-xs rounded-full
                flex items-center gap-2
                ${pendingStatus ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}
                transition-colors duration-200
              `}
            >
              <span>{pendingStatus || task.status}</span>
              {isAnimating && (
                <div className="w-3 h-3 relative">
                  <div 
                    className="absolute w-3 h-3 border-2 border-blue-500 border-t-transparent 
                              rounded-full animate-[spin_2s_linear_1]"
                  />
                </div>
              )}
            </button>
          </div>

          {task.dueDate && (
            <div className="flex items-center text-xs text-gray-500">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {getTimeUntilDue(task.dueDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskCard
