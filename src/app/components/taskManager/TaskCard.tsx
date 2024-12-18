'use client'

import { Task, TaskStatus, Category } from '@prisma/client'
import { useState, useEffect, useRef } from 'react'
import { ClockIcon } from '@heroicons/react/24/outline'
import { useQueryClient } from '@tanstack/react-query'

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

const getNextStatus = (currentStatus: TaskStatus): TaskStatus => {
  const statusOrder: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'COMPLETED']
  const currentIndex = statusOrder.indexOf(currentStatus)
  return statusOrder[(currentIndex + 1) % statusOrder.length]
}

const TaskCard = ({ task, isDragging, dragHandleProps, userId, onEdit, onStatusChange }: TaskCardProps) => {
  const [pendingStatus, setPendingStatus] = useState<TaskStatus | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
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

  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      setIsAnimating(false)
    }
    
    const nextStatus = getNextStatus(pendingStatus || task.status)
    setPendingStatus(nextStatus)
    setIsAnimating(true)

    timerRef.current = setTimeout(async () => {
      try {
        setIsAnimating(false)
        await onStatusChange(task.id, nextStatus)
        setPendingStatus(null)
      } catch (error) {
        console.error('Failed to update status:', error)
        setPendingStatus(null)
      }
    }, 2000)
  }

  // ... rest of the existing helper functions ...

  return (
    <div
      onClick={() => onEdit(task)}
      className={`
        group bg-surface rounded-lg shadow-lg border border-white/5 cursor-pointer
        ${isDragging ? 'opacity-50 shadow-xl' : 'hover:border-white/50'}
        transition-all duration-200
      `}
      {...dragHandleProps}
    >
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
          <h3 className="text-sm font-medium text-primary line-clamp-2 break-words flex-1 min-w-0">
            {task.title}
          </h3>
          {task.dueDate && (
            <div className="flex items-center gap-2 shrink-0 text-primary-muted py-0.5">
              <ClockIcon className="h-4 w-4 shrink-0" />
              <span className="text-xs whitespace-nowrap">{getTimeUntilDue(task.dueDate)}</span>
            </div>
          )}
        </div>
        
        {/* Description */}
        {task.description && (
          <p className="mt-1.5 text-sm text-primary-muted line-clamp-2 break-words">
            {task.description}
          </p>
        )}

        {/* Footer: Category and Status */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {task.category && (
              <span className="px-2 py-1 text-sm rounded-md bg-white/5 text-primary-muted">
                {task.category.name}
              </span>
            )}
          </div>
          
          <div className="relative inline-flex items-center">
            <button
              onClick={handleStatusClick}
              disabled={!isAnimating && pendingStatus !== null && pendingStatus !== task.status}
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
                {(pendingStatus || task.status) === 'IN_PROGRESS' ? 'IN PROGRESS' : pendingStatus || task.status}
              </span>
              {isAnimating && (
                <div className="w-3 h-3 relative">
                  <div 
                    className="absolute w-3 h-3 border-2 border-black border-t-transparent 
                              rounded-full animate-[spin_2s_linear_1]"
                  />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TaskCard
