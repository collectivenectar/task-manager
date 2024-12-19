import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../Modal'

describe('Modal', () => {
  const mockOnClose = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders modal content when open', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div data-testid="test-modal-content">Test Content</div>
      </Modal>
    )

    expect(screen.getByTestId('modal-panel')).toBeInTheDocument()
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Test Modal')
    expect(screen.getByTestId('modal-content')).toBeInTheDocument()
    expect(screen.getByTestId('test-modal-content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <div data-testid="modal-content">Test Content</div>
      </Modal>
    )

    expect(screen.queryByTestId('modal-panel')).not.toBeInTheDocument()
  })

  it('calls onClose when backdrop is clicked', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div data-testid="modal-content">Test Content</div>
      </Modal>
    )

    const backdrop = screen.getByTestId('modal-backdrop')
    fireEvent.click(backdrop)
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onClose when escape key is pressed', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div data-testid="modal-content">Test Content</div>
      </Modal>
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('does not call onClose when clicking modal content', () => {
    render(
      <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <div data-testid="test-specific-content">Test Content</div>
      </Modal>
    )

    fireEvent.click(screen.getByTestId('test-specific-content'))
    expect(mockOnClose).not.toHaveBeenCalled()
  })
}) 