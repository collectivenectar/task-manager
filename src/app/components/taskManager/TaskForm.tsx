import React, { useState } from 'react'
import { Category, Task, TaskStatus } from '@prisma/client'
import { createCategory } from '@/app/actions'
import { taskSchema } from '@/lib/schemas/task'
import { z } from 'zod'

interface TaskFormProps {
  onSubmit: (data: {
    title: string
    description?: string | null
    status: TaskStatus
    dueDate?: Date | null
    categoryId: string
  }) => void
  onCancel: () => void
  onCategoryCreate: (data: { name: string }) => Promise<Category>
  initialData?: Task
  categories: Category[]
  userId: string
}

type FormErrors = { [key: string]: string }

const TaskForm: React.FC<TaskFormProps> = ({ onSubmit, onCancel, onCategoryCreate, initialData, categories, userId }) => {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const validated = taskSchema.parse(formData)
      onSubmit(validated)
      // Reset form if not editing, but keep the default category
      if (!initialData) {
        setFormData({
          title: '',
          description: '',
          status: 'TODO',
          dueDate: null,
          categoryId: defaultCategory.id  // Keep the default category
        })
      }
    } catch (error) {
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

  // Rest of the JSX remains the same, but add error display:
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Task Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm 
            ${errors.title ? 'border-red-500' : 'border-gray-300'}
            focus:border-indigo-500 focus:ring-indigo-500
            text-gray-900 bg-white`}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500">{errors.title}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm 
            ${errors.description ? 'border-red-500' : 'border-gray-300'}
            focus:border-indigo-500 focus:ring-indigo-500
            text-gray-900 bg-white`}
          placeholder="Enter task description"
          rows={3}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-500">{errors.description}</p>
        )}
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm 
            ${errors.status ? 'border-red-500' : 'border-gray-300'}
            focus:border-indigo-500 focus:ring-indigo-500
            text-gray-900 bg-white`}
        >
          <option value="TODO">To Do</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
        </select>
        {errors.status && (
          <p className="mt-1 text-sm text-red-500">{errors.status}</p>
        )}
      </div>

      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
          Due Date
        </label>
        <input
          type="datetime-local"
          id="dueDate"
          name="dueDate"
          value={formData.dueDate?.toLocaleString('sv').slice(0, 16) || ''}
          onChange={handleChange}
          className={`mt-1 block w-full rounded-md shadow-sm 
            ${errors.dueDate ? 'border-red-500' : 'border-gray-300'}
            focus:border-indigo-500 focus:ring-indigo-500
            text-gray-900 bg-white`}
        />
        {errors.dueDate && (
          <p className="mt-1 text-sm text-red-500">{errors.dueDate}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Category
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, categoryId: category.id }))}
              className={`
                px-3 py-1 rounded-full text-sm
                ${formData.categoryId === category.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                transition-colors duration-200
              `}
            >
              {category.name}
              {category.isDefault && ' (Default)'}
            </button>
          ))}
          
          <button
            type="button"
            onClick={() => setIsAddingCategory(true)}
            className={`
              px-3 py-1 rounded-full text-sm
              bg-gray-100 text-gray-700 hover:bg-gray-200
              transition-colors duration-200
              ${isAddingCategory ? 'hidden' : ''}
            `}
          >
            + Add Category
          </button>
          
          {isAddingCategory && (
            <div className="w-full mt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name"
                  className="px-3 py-1 rounded-full text-sm border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-3 py-1 rounded-full text-sm bg-indigo-600 text-white hover:bg-indigo-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingCategory(false);
                    setNewCategoryName('');
                  }}
                  className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        {errors.categoryId && (
          <p className="mt-1 text-sm text-red-500">{errors.categoryId}</p>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-md 
                   hover:bg-indigo-700 focus:outline-none focus:ring-2 
                   focus:ring-indigo-500 focus:ring-offset-2"
        >
          {initialData ? 'Update Task' : 'Add Task'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md 
                   hover:bg-gray-200 focus:outline-none focus:ring-2 
                   focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default TaskForm
