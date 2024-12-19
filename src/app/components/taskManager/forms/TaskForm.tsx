import React, { useState } from 'react'
import { Category, Task, TaskStatus } from '@prisma/client'
import DeleteConfirmationModal from '@/app/components/taskManager/modals/DeleteConfirmationModal'
import DeleteCategoryModal from '../modals/DeleteCategoryModal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTasksByCategory, deleteCategory, createTaskBatch } from '@/app/actions'
import { TrashIcon } from '@heroicons/react/24/outline'
import { alerts } from '@/lib/utils/alerts'
import { ValidationError } from '@/lib/errors'
import { SmartTaskModal } from '../modals/SmartTaskModal'
import { getSmartTaskSuggestions, SmartTaskResponse } from '@/app/actions'
import { TaskFormData } from '@/lib/schemas/task'

interface TaskFormProps {
  onSubmit: (data: {
    title: string
    description?: string | null
    status: TaskStatus
    dueDate?: Date | null
    categoryId: string
  }) => void
  onCancel: () => void
  onDelete?: (taskId: string) => void
  onCategoryCreate: (data: { name: string }) => Promise<Category>
  initialData?: Task
  categories: Category[]
  userId: string
}

type FormErrors = { [key: string]: string }

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onCancel, onDelete, onCategoryCreate, initialData, categories, userId }) => {
  const queryClient = useQueryClient()

  const defaultCategory = categories.find(c => c.isDefault)
  if (!defaultCategory) {
    throw new Error('Default category is required')
  }

  const [formData, setFormData] = useState<{
    title: string
    description: string | null
    status: TaskStatus
    dueDate: Date | null
    categoryId: string
  }>({
    title: initialData?.title || '',
    description: initialData?.description ?? null,
    status: initialData?.status || 'TODO',
    dueDate: initialData?.dueDate || null,
    categoryId: initialData?.categoryId || defaultCategory.id
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)
  const [isSmartModalOpen, setIsSmartModalOpen] = useState(false)
  const [isGettingSuggestions, setIsGettingSuggestions] = useState(false)
  const [suggestion, setSuggestion] = useState<SmartTaskResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: affectedTasks = [] } = useQuery({
    queryKey: ['tasks', 'category', categoryToDelete?.id],
    queryFn: () => categoryToDelete 
      ? getTasksByCategory(userId, categoryToDelete.id)
        .catch(error => {
          if (error.message.includes('not found')) {
            return []
          }
          throw error
        })
      : Promise.resolve([]),
    enabled: !!categoryToDelete,
    retry: false,
    staleTime: 0,
    gcTime: 0
  })

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    
    if (name === 'dueDate') {
      setFormData(prev => ({
        ...prev,
        [name]: value ? new Date(value) : null
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    if (errors[name]) {
      setErrors(prev => {
        const { [name]: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedTitle = formData.title.trim()
    const trimmedDescription = formData.description?.trim() || ''
    
    if (!trimmedTitle) {
      setErrors({ title: 'Title is required' })
      return
    }

    try {
      await onSubmit({
        title: trimmedTitle,
        description: trimmedDescription || undefined,
        status: formData.status as TaskStatus,
        dueDate: formData.dueDate,
        categoryId: formData.categoryId
      })

      if (!initialData) {
        setFormData({
          title: '',
          description: '',
          status: 'TODO',
          dueDate: null,
          categoryId: defaultCategory.id
        })
        setErrors({})
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ title: error.message })
      } else {
        console.error('Form submission error:', error)
        alerts.error('Failed to save task')
      }
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    try {
      const newCategory = await onCategoryCreate({ name: newCategoryName.trim() });
      setFormData(prev => ({ ...prev, categoryId: newCategory.id }));
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ title: error.message })
      } else {
        setErrors({ title: 'Failed to create category' })
      }
      console.error('Failed to create category:', error);
    }
  }

  const handleCategoryDelete = async (mode: 'delete_all' | 'move', targetCategoryId?: string) => {
    try {
      if (!categoryToDelete) return
      
      alerts.info('Deleting category...')
      
      await deleteCategory(userId, categoryToDelete.id, mode, targetCategoryId)
      
      queryClient.setQueryData(['tasks', 'category', categoryToDelete.id], [])
      await queryClient.invalidateQueries({ 
        queryKey: ['categories'],
        exact: true 
      })
      await queryClient.invalidateQueries({ 
        queryKey: ['tasks'],
        exact: true
      })
      
      setCategoryToDelete(null)
      if (initialData && initialData.categoryId === categoryToDelete.id) {
        onCancel()
      }
      alerts.success('Category deleted successfully')
    } catch (error) {
      console.error('Failed to delete category:', error)
      alerts.error(error instanceof Error ? error.message : 'Failed to delete category')
    }
  }

  const handleSmartSuggestion = async (additionalContext: string, shouldBreakdown: boolean) => {
    try {
      const categoryNames = categories
        .filter(c => !c.isDefault)
        .map(c => c.name)

      const newSuggestion = await getSmartTaskSuggestions({
        title: formData.title,
        description: formData.description || '',
        category: categories.find(c => c.id === formData.categoryId)?.name,
        dueDate: formData.dueDate?.toISOString(),
        additionalContext,
        categories: categoryNames,
        shouldBreakdown
      })
      setSuggestion(newSuggestion)
      return newSuggestion
    } catch (error) {
      console.error('Failed to get suggestions:', error)
      alerts.error('Failed to get suggestions')
      throw error
    }
  }

  const handleSmartConfirm = async (data: TaskFormData, createMultiple: boolean) => {
    setIsSubmitting(true)
    try {
      let targetCategoryId = data.categoryId
      if (suggestion?.suggestedCategory) {
        const existingCategory = categories.find(c => 
          c.name.toLowerCase() === suggestion.suggestedCategory?.toLowerCase()
        )
        
        if (!existingCategory) {
          const newCategory = await onCategoryCreate({ 
            name: suggestion.suggestedCategory 
          })
          targetCategoryId = newCategory.id
        } else {
          targetCategoryId = existingCategory.id
        }
      }

      if (createMultiple && suggestion?.subtasks) {
        const totalTasks = suggestion.subtasks.length + 1
        alerts.info(`Creating ${totalTasks} tasks...`)

        await createTaskBatch(userId, {
          mainTask: {
            ...data,
            categoryId: targetCategoryId
          },
          subtasks: suggestion.subtasks.map(task => ({
            title: task.title,
            description: task.description,
            status: 'TODO',
            categoryId: targetCategoryId
          }))
        })

        alerts.success(`Successfully created ${totalTasks} tasks`)
        
        await queryClient.invalidateQueries({ queryKey: ['tasks'] })
        onCancel()
      } else {
        await onSubmit({
          ...data,
          categoryId: targetCategoryId
        })
        onCancel()
      }

    } catch (error) {
      console.error('Failed to create tasks:', error)
      alerts.error('Failed to create tasks')
    } finally {
      setIsSubmitting(false)
      setIsSmartModalOpen(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" data-testid="task-form">
        <div>
          <div className="flex justify-between items-center mb-2">
            <label htmlFor="title" className="text-sm font-medium text-primary-muted">
              Task title
            </label>
            <button
              type="button"
              onClick={() => setIsSmartModalOpen(true)}
              className="text-base text-accent hover:text-accent-hover transition-colors"
            >
              ✨ Need help? Try AI suggestions
            </button>
          </div>
          <input
            id="title"
            name="title"
            data-testid="task-title-input"
            value={formData.title}
            onChange={handleChange}
            className={`
              w-full rounded-lg bg-surface border
              ${errors.title ? 'border-red-500' : 'border-white/10'}
              px-3 py-3 sm:py-2 text-base sm:text-sm text-primary
              placeholder:text-primary-muted
              focus:outline-none focus:ring-2 focus:ring-white/20
              transition-all duration-200
            `}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-500">{errors.title}</p>
          )}
        </div>

        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            data-testid="task-description-input"
            value={formData.description || ''}
            onChange={handleChange}
            rows={3}
            className={`
              w-full rounded-lg bg-surface border
              ${errors.description ? 'border-red-500' : 'border-white/10'}
              px-3 py-2 text-sm text-primary
              placeholder:text-primary-muted
              focus:outline-none focus:ring-2 focus:ring-white/20
              transition-all duration-200
            `}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description}</p>
          )}
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-primary-muted mb-2">
            Status
          </label>
          <select
            id="status"
            name="status"
            data-testid="task-status-select"
            value={formData.status}
            onChange={handleChange}
            className={`
              w-full rounded-lg bg-surface border border-white/10
              px-3 py-2 text-sm text-primary
              focus:outline-none focus:ring-2 focus:ring-white/20
              transition-all duration-200
            `}
          >
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-primary-muted mb-2">
            Due Date
          </label>
          <div className="relative">
            <input
              type="datetime-local"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate?.toLocaleString('sv').slice(0, 16) || ''}
              onChange={handleChange}
              className={`
                w-full h-11 rounded-lg bg-surface border border-white/10
                px-3 text-sm text-primary
                focus:outline-none focus:ring-2 focus:ring-white/20
                transition-all duration-200
                [color-scheme:dark]
              `}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-primary-muted">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {categories?.map(category => (
              <div 
                key={category.id}
                className={`
                  flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all
                  ${formData.categoryId === category.id
                    ? 'bg-white/20 text-primary border border-white/20' 
                    : 'bg-surface border border-white/10 text-primary-muted hover:text-primary hover:border-white/20'
                  }
                `}
              >
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, categoryId: category.id }))}
                  className="flex-1"
                >
                  {category.name}
                </button>
                
                {!category.isDefault && (
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(category)}
                    className="text-primary-muted hover:text-red-400 transition-colors pl-2 border-l border-white/10"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span className="sr-only">Delete {category.name}</span>
                  </button>
                )}
              </div>
            ))}
            
            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              className={`
                px-3 py-1.5 rounded-lg text-sm
                bg-surface border border-white/10 
                text-primary-muted hover:text-primary hover:border-white/20
                transition-all duration-200
                ${isAddingCategory ? 'hidden' : ''}
              `}
            >
              + Add Category
            </button>
          </div>

          {isAddingCategory && (
            <div className="mt-3 flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="New category name"
                className="flex-1 px-3 py-1.5 rounded-lg text-sm
                         bg-surface border border-white/10 text-primary
                         placeholder:text-primary-muted
                         focus:outline-none focus:ring-2 focus:ring-accent/50"
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3 py-1.5 rounded-lg text-sm
                         bg-accent text-primary hover:bg-accent-hover
                         transition-colors"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingCategory(false)
                  setNewCategoryName('')
                }}
                className="px-3 py-1.5 rounded-lg text-sm
                         bg-surface border border-white/10
                         text-primary-muted hover:text-primary hover:border-white/20
                         transition-all"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-4">
          {initialData && (
            <button
              type="button"
              data-testid="task-delete-button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="w-full px-4 py-2 rounded-lg text-red-400 hover:text-red-300
                       hover:bg-red-500/10 transition-all border border-red-500/20"
            >
              Delete Task
            </button>
          )}
          <div className="flex gap-3">
            <button
              type="submit"
              data-testid="task-submit-button"
              className="flex-1 bg-white/90 text-black px-4 py-2 rounded-lg
                       hover:bg-white/75 transition-colors"
            >
              {initialData ? 'Update' : 'Add Task'}
            </button>
            <button
              type="button"
              data-testid="task-cancel-button"
              onClick={onCancel}
              className="flex-1 bg-surface border border-white/10 text-primary-muted 
                       px-4 py-2 rounded-lg hover:text-primary hover:border-white/20
                       transition-all"
              aria-label="Cancel"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (initialData && onDelete) {
            onDelete(initialData.id)
          }
          setIsDeleteModalOpen(false)
        }}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />

      {categoryToDelete && (
        <DeleteCategoryModal
          isOpen={!!categoryToDelete}
          onClose={() => setCategoryToDelete(null)}
          category={categoryToDelete}
          categories={categories}
          affectedTasks={affectedTasks}
          onConfirm={handleCategoryDelete}
        />
      )}

      <SmartTaskModal
        isOpen={isSmartModalOpen}
        onClose={() => setIsSmartModalOpen(false)}
        initialData={formData}
        onConfirm={handleSmartConfirm}
        onRetry={handleSmartSuggestion}
      />
    </>
  )
}

export default TaskForm
