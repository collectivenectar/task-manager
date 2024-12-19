'use client'

import { Task, TaskStatus, Category } from '@prisma/client'
import { useState, useRef, memo } from 'react'
import { ClockIcon, ChevronUpDownIcon } from '@heroicons/react/24/outline'

interface TaskCardProps {
  task: Task & {
    category: Category | null
  }
  isDragging?: boolean
  dragHandleProps?: any
  userId: string
  onEdit: (task: Task) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>
  isAllView: boolean
}

const getNextStatus = (currentStatus: TaskStatus): TaskStatus => {
  const statusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED']
  const currentIndex = statusOrder.indexOf(currentStatus)
  return statusOrder[(currentIndex + 1) % statusOrder.length]
}

const TaskCard = ({ task, isDragging, dragHandleProps, userId, onEdit, onStatusChange, isAllView }: TaskCardProps) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<TaskStatus>(task.status)
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const getTimeUntilDue = (dueDate: Date): string => {
    const now = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    return `${diffDays} days`
  }

  const handleStatusClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    
    const nextStatus = getNextStatus(pendingStatus)
    setPendingStatus(nextStatus)
    setIsAnimating(true)

    timerRef.current = setTimeout(async () => {
      try {
        await onStatusChange(task.id, nextStatus)
      } catch (error) {
        console.error('Failed to update status:', error)
        setPendingStatus(task.status)
      } finally {
        setIsAnimating(false)
      }
    }, 2000)
  }

  return (
    <div
      data-testid={`task-card-${task.id}`}
      onClick={() => onEdit(task)}
      className={`
        group bg-surface rounded-lg shadow-lg border border-white/5 cursor-pointer
        ${isDragging ? 'opacity-50 shadow-xl' : 'hover:border-white/50'}
        transition-all duration-200
      `}
    >
      <div className="p-4 relative">
        <h3 
          data-testid="task-title"
          className="text-sm font-medium text-primary line-clamp-2 break-words pr-12"
        >
          {task.title}
        </h3>

        {!isAllView && (
          <button
            className="absolute top-2 right-2 p-3
                      text-primary-muted hover:text-primary
                      rounded-lg hover:bg-white/5
                      touch-manipulation cursor-grab active:cursor-grabbing
                      transition-all duration-200"
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
          >
            <ChevronUpDownIcon className="h-8 w-8" />
            <span className="sr-only">Drag to reorder</span>
          </button>
        )}

        {task.dueDate && (
          <div 
            data-testid="task-due-date"
            className="mt-2 flex items-center gap-2 text-primary-muted"
          >
            <ClockIcon className="h-4 w-4 shrink-0" />
            <span className="text-xs whitespace-nowrap">
              {getTimeUntilDue(task.dueDate)}
            </span>
          </div>
        )}

        {task.description && (
          <p 
            data-testid="task-description"
            className="mt-1.5 text-sm text-primary-muted line-clamp-2 break-words"
          >
            {task.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {task.category && (
              <span 
                data-testid="task-category"
                className="px-2 py-1 text-sm rounded-md bg-white/5 text-primary-muted"
              >
                {task.category.name}
              </span>
            )}
          </div>
          
          <button
            type="button"
            data-testid="task-status-button"
            onClick={handleStatusClick}
            className={`
              px-3 py-1.5 text-xs rounded-lg
              flex items-center gap-2
              ${isAnimating 
                ? 'bg-white text-black' 
                : 'bg-white/80 text-black hover:bg-white/15 hover:text-white'
              }
              transition-all duration-200 hover:scale-105
            `}
          >
            <span>
              {pendingStatus === 'IN_PROGRESS' ? 'IN PROGRESS' : pendingStatus}
            </span>
            {isAnimating && (
              <div 
                data-testid="status-loading-indicator"
                className="w-3 h-3 relative"
              >
                <div className="absolute w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-[spin_2s_linear_1]" />
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(TaskCard, (prev, next) => {
  return prev.task.id === next.task.id && 
         prev.task.updatedAt === next.task.updatedAt &&
         prev.isDragging === next.isDragging
})
