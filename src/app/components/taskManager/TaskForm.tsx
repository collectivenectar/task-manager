import React, { useState } from 'react'
import { Category, Task, TaskStatus } from '@prisma/client'
import { createCategory } from '@/app/actions'
import { taskSchema } from '@/lib/schemas/task'
import { z } from 'zod'
import DeleteConfirmationModal from '@/app/components/common/DeleteConfirmationModal'
import DeleteCategoryModal from '../common/DeleteCategoryModal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getTasksByCategory, deleteCategory } from '@/app/actions'
import { TrashIcon } from '@heroicons/react/24/outline'
import { alerts } from '@/lib/utils/alerts'

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
  // Get queryClient instance
  const queryClient = useQueryClient()

  // Find default category
  const defaultCategory = categories.find(c => c.isDefault)
  if (!defaultCategory) {
    throw new Error('Default category is required')
  }

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    status: initialData?.status || 'TODO',
    dueDate: initialData?.dueDate || null,
    // Always have a category selected - either the task's category or the default
    categoryId: initialData?.categoryId || defaultCategory.id
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isAddingCategory, setIsAddingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null)

  const { data: affectedTasks = [] } = useQuery({
    queryKey: ['tasks', 'category', categoryToDelete?.id],
    queryFn: () => categoryToDelete 
      ? getTasksByCategory(userId, categoryToDelete.id)
        .catch(error => {
          // If the category is not found, return empty array
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
    
    // Special handling for date - preserve the exact input value
    if (name === 'dueDate') {
      setFormData(prev => ({
        ...prev,
        [name]: value ? new Date(value) : null
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
    // Clear error when field is modified
    if (errors[name]) {
      setErrors(prev => {
        const { [name]: _, ...rest } = prev
        return rest
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const validated = taskSchema.parse(formData)
      await onSubmit(validated)
      // Only reset after successful submission
      if (!initialData) {
        setFormData({
          title: '',
          description: '',
          status: 'TODO',
          dueDate: null,
          categoryId: defaultCategory.id
        })
      }
    } catch (error) {
      console.error('Form validation error:', error)
      if (error instanceof z.ZodError) {
        const newErrors: FormErrors = {}
        error.errors.forEach(err => {
          const field = err.path[0] as string
          newErrors[field] = err.message
        })
        setErrors(newErrors)
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
      console.error('Failed to create category:', error);
    }
  }

  const handleCategoryDelete = async (targetCategoryId: string) => {
    try {
      if (!categoryToDelete) return
      
      alerts.info('Deleting category...')
      
      await deleteCategory(userId, categoryToDelete.id, targetCategoryId)
      
      // First, remove the category from the cache to prevent unnecessary refetches
      queryClient.setQueryData(['tasks', 'category', categoryToDelete.id], [])
      
      // Then invalidate queries in sequence
      await queryClient.invalidateQueries({ 
        queryKey: ['categories'],
        exact: true 
      })
      await queryClient.invalidateQueries({ 
        queryKey: ['tasks'],
        exact: true
      })
      
      // Close modal and show success message
      setCategoryToDelete(null)
      alerts.success('Category deleted successfully')
    } catch (error) {
      console.error('Failed to delete category:', error)
      alerts.error(error instanceof Error ? error.message : 'Failed to delete category')
    }
  }

  // Rest of the JSX remains the same, but add error display:
  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-primary-muted mb-2">
            Task Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
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
          <label htmlFor="description" className="block text-sm font-medium text-primary-muted mb-2">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
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
            {categories.map(category => (
              <div key={category.id} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, categoryId: category.id }))}
                  className={`
                    px-4 py-1.5 text-sm rounded-lg flex-1
                    ${formData.categoryId === category.id
                      ? 'bg-white/90 text-black'
                      : 'bg-surface border border-white/10 text-primary-muted hover:text-primary hover:border-white/20'
                    }
                    transition-all duration-200
                  `}
                >
                  {category.name}
                  {category.isDefault && ' (Default)'}
                </button>
                
                {!category.isDefault && (
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(category)}
                    className="p-1.5 text-red-400 hover:text-red-300
                             hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <TrashIcon className="h-4 w-4" />
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
              className="flex-1 bg-white/90 text-black px-4 py-2 rounded-lg
                       hover:bg-white/75 transition-colors"
            >
              {initialData ? 'Update' : 'Add Task'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-surface border border-white/10 text-primary-muted 
                       px-4 py-2 rounded-lg hover:text-primary hover:border-white/20
                       transition-all"
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
    </>
  )
}

export default TaskForm
