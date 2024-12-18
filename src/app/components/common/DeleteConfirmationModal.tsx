import Modal from './Modal'

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
}

const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: DeleteConfirmationModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <p className="text-primary-muted">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500/20 text-red-400 px-4 py-2 rounded-lg
                     hover:bg-red-500/30 hover:text-red-300 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={onClose}
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

export default DeleteConfirmationModal 