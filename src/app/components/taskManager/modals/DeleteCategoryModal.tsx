import { Category, Task } from '@prisma/client'
import { useState } from 'react'
import Modal from '../../common/Modal'

interface DeleteCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  category: Category
  categories: Category[]
  affectedTasks: Task[]
  onConfirm: (mode: 'delete_all' | 'move', targetCategoryId?: string) => Promise<void>
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

  const handleConfirm = async (action: 'delete_all' | 'move') => {
    if (action === 'move' && !targetCategoryId) return
    
    setIsDeleting(true)
    setError(null)
    
    try {
      await onConfirm(action, targetCategoryId)
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
        <p className="text-primary-muted">
          Are you sure you want to delete the category "{category.name}"?
        </p>
        
        {affectedTasks.length > 0 && (
          <div className="bg-yellow-500/10 p-4 rounded-lg">
            <p className="text-yellow-500 mb-4">
              This category has {affectedTasks.length} tasks.
            </p>
            
            <div className="space-y-4">
              <button
                onClick={() => handleConfirm('delete_all')}
                className="w-full px-4 py-2 bg-red-500/20 text-red-400 rounded-lg
                         hover:bg-red-500/30 transition-colors text-left"
              >
                Delete category and all its tasks
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-2 bg-surface text-primary-muted text-sm">or</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-primary-muted">
                  Move tasks to another category:
                </label>
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="w-full rounded-lg bg-surface border border-white/10
                           px-3 py-2 text-sm text-primary"
                  required
                >
                  <option value="">Select a category</option>
                  {otherCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={() => handleConfirm('move')}
                  disabled={!targetCategoryId}
                  className="w-full px-4 py-2 bg-white/10 text-primary rounded-lg
                           hover:bg-white/20 transition-colors disabled:opacity-50
                           disabled:cursor-not-allowed"
                >
                  Move tasks and delete category
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default DeleteCategoryModal 