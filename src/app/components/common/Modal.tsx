import React, { useEffect, useCallback } from 'react';
import { Dialog } from '@headlessui/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      // Only close if the click/touch was directly on the backdrop
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Dialog 
      open={isOpen} 
      onClose={(e: any) => {
        e?.preventDefault?.()
        onClose()
      }}
      className="relative z-50"
    >
      <div 
        className="fixed inset-0 bg-black/30" 
        aria-hidden="true"
        data-testid="modal-backdrop"
        onClick={(e) => {
          e.preventDefault()
          if (e.target === e.currentTarget) {
            onClose()
          }
        }}
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel 
          data-testid="modal-panel"
          className="mx-auto max-w-sm md:max-w-2xl lg:max-w-4xl rounded-xl bg-surface border border-white/10 
                     p-6 md:p-8 lg:p-10"
        >
          <Dialog.Title 
            data-testid="modal-title"
            className="text-xl font-medium text-primary mb-4"
          >
            {title}
          </Dialog.Title>
          <div data-testid="modal-content">
            {children}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default Modal;