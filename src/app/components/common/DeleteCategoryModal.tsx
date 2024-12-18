import { Category, Task } from '@prisma/client'
import { useState } from 'react'
import Modal from './Modal'

interface DeleteCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category: Category
  categories: Category[]
  affectedTasks: Task[]
  onConfirm: (targetCategoryId: string) => Promise<void>
}

const DeleteCategoryModal = ({
  isOpen,
  onClose,
  category,
  categories,
  affectedTasks,
  onConfirm
}: DeleteCategoryModalProps) => {
  const [targetCategoryId, setTargetCategoryId] = useState<string>('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (affectedTasks.length > 0 && !targetCategoryId) return
    
    setIsDeleting(true)
    setError(null)
    
    try {
      await onConfirm(targetCategoryId)
      onClose()
    } catch (error) {
      console.error('Failed to delete category:', error)
      setError(error instanceof Error ? error.message : 'Failed to delete category')
    } finally {
      setIsDeleting(false)
    }
  }

  const otherCategories = categories.filter(c => 
    c.id !== category.id && !c.isDefault
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Category"
    >
      <div className="space-y-4">
        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
        
        <p className="text-primary">
          {affectedTasks.length === 0 ? (
            'Are you sure you want to delete this category?'
          ) : (
            `This category contains ${affectedTasks.length} task${
              affectedTasks.length === 1 ? '' : 's'
            }. Please select a new category for these tasks before deleting.`
          )}
        </p>

        {affectedTasks.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-primary-muted">
              Move tasks to:
            </label>
            <select
              value={targetCategoryId}
              onChange={(e) => setTargetCategoryId(e.target.value)}
              className="w-full rounded-lg bg-surface border border-white/10
                       px-3 py-2 text-sm text-primary
                       focus:outline-none focus:ring-2 focus:ring-white/20"
              required
            >
              <option value="">Select a category</option>
              {otherCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleConfirm}
            disabled={affectedTasks.length > 0 && !targetCategoryId || isDeleting}
            className={`
              flex-1 px-4 py-2 rounded-lg
              ${isDeleting 
                ? 'bg-red-500/50 cursor-not-allowed' 
                : error 
                  ? 'bg-red-400 hover:bg-red-500'
                  : 'bg-red-500 hover:bg-red-600'
              }
              text-white transition-colors
            `}
          >
            {isDeleting ? 'Deleting...' : 'Delete Category'}
          </button>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 bg-surface border border-white/10 text-primary-muted 
                     px-4 py-2 rounded-lg hover:text-primary hover:border-white/20
                     transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteCategoryModal 