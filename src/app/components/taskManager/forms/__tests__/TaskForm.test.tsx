import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import TaskForm from '../TaskForm'
import { Task, Category } from '@prisma/client'
import { toast } from 'react-toastify'

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}))

describe('TaskForm', () => {
  const mockOnSubmit = jest.fn()
  const mockOnCancel = jest.fn()
  const mockOnCategoryCreate = jest.fn()
  const mockCategories = [{
    id: 'default-category',
    name: 'Default',
    isDefault: true,
    position: 0,
    userId: 'test-user',
    createdAt: new Date(),
    updatedAt: new Date()
  }]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const renderForm = (props = {}) => {
    return renderWithProviders(
      <TaskForm 
        onSubmit={mockOnSubmit} 
        onCancel={mockOnCancel}
        onCategoryCreate={mockOnCategoryCreate}
        categories={mockCategories}
        userId="test-user"
        {...props} 
      />
    )
  }

  describe('Rendering', () => {
    it('renders empty form correctly', () => {
      renderForm()
      expect(screen.getByTestId('task-title-input')).toHaveValue('')
      expect(screen.getByTestId('task-description-input')).toHaveValue('')
      expect(screen.getByTestId('task-submit-button')).toBeInTheDocument()
      expect(screen.getByTestId('task-cancel-button')).toBeInTheDocument()
    })

    it('renders form with initial data', () => {
      const initialData: Task = {
        id: '1',
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        position: 1000,
        userId: 'user1',
        categoryId: 'category1',
        createdAt: new Date(),
        updatedAt: new Date(),
        dueDate: null
      }

      renderForm({ initialData })
      expect(screen.getByTestId('task-title-input')).toHaveValue('Test Task')
      expect(screen.getByTestId('task-description-input')).toHaveValue('Test Description')
      expect(screen.getByTestId('task-delete-button')).toBeInTheDocument()
    })
  })

  describe('Input Handling', () => {
    it('handles input changes correctly', () => {
      renderForm()
      const titleInput = screen.getByTestId('task-title-input')
      const descriptionInput = screen.getByTestId('task-description-input')

      fireEvent.change(titleInput, { target: { value: 'New Task' } })
      fireEvent.change(descriptionInput, { target: { value: 'New Description' } })

      expect(titleInput).toHaveValue('New Task')
      expect(descriptionInput).toHaveValue('New Description')
    })

    it('updates input value immediately after typing', () => {
      renderForm()
      const titleInput = screen.getByTestId('task-title-input')
      
      fireEvent.change(titleInput, { target: { value: 'T' } })
      expect(titleInput).toHaveValue('T')
      
      fireEvent.change(titleInput, { target: { value: 'Te' } })
      expect(titleInput).toHaveValue('Te')
      
      fireEvent.change(titleInput, { target: { value: 'Test' } })
      expect(titleInput).toHaveValue('Test')
    })
  })

  describe('Form Submission', () => {
    it('submits form with correct data', () => {
      renderForm()

      fireEvent.change(screen.getByTestId('task-title-input'), { 
        target: { value: 'New Task' } 
      })
      fireEvent.change(screen.getByTestId('task-description-input'), { 
        target: { value: 'New Description' } 
      })
      
      fireEvent.click(screen.getByTestId('task-submit-button'))

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'New Description',
        status: 'TODO',
        categoryId: 'default-category',
        dueDate: null
      })
    })

    it('prevents submission with empty title', () => {
      renderForm()
      fireEvent.change(screen.getByTestId('task-description-input'), { 
        target: { value: 'New Description' } 
      })
      
      fireEvent.click(screen.getByTestId('task-submit-button'))
      expect(mockOnSubmit).not.toHaveBeenCalled()
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })

    it('clears form after successful submission', async () => {
      const onSubmit = jest.fn().mockResolvedValue({})
      renderWithProviders(
        <TaskForm
          onSubmit={onSubmit}
          onCancel={() => {}}
          onCategoryCreate={async () => ({ id: '1', name: 'Test' } as Category)}
          categories={mockCategories}
          userId="test-user"
        />
      )

      const titleInput = screen.getByTestId('task-title-input')
      const descriptionInput = screen.getByTestId('task-description-input')

      fireEvent.change(titleInput, { target: { value: 'New Task' } })
      fireEvent.change(descriptionInput, { target: { value: 'Description' } })
      fireEvent.click(screen.getByTestId('task-submit-button'))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
        expect(titleInput).toHaveValue('')
        expect(descriptionInput).toHaveValue('')
      })
    })

    it('displays error message on submission failure', async () => {
      mockOnSubmit.mockRejectedValue(new Error('Submission failed'))
      renderForm()

      fireEvent.change(screen.getByTestId('task-title-input'), {
        target: { value: 'Test Task' }
      })
      
      fireEvent.click(screen.getByTestId('task-submit-button'))

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save task')
      })
    })
  })

  describe('Input Validation', () => {
    it('trims whitespace from inputs before submission', () => {
      renderForm()

      fireEvent.change(screen.getByTestId('task-title-input'), { 
        target: { value: '  New Task  ' } 
      })
      fireEvent.change(screen.getByTestId('task-description-input'), { 
        target: { value: '  New Description  ' } 
      })
      
      fireEvent.click(screen.getByTestId('task-submit-button'))

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'New Task',
        description: 'New Description',
        status: 'TODO',
        categoryId: 'default-category',
        dueDate: null
      })
    })

    it('handles empty description correctly', () => {
      renderForm()

      fireEvent.change(screen.getByTestId('task-title-input'), { 
        target: { value: 'New Task' } 
      })
      
      fireEvent.click(screen.getByTestId('task-submit-button'))

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'New Task',
        description: undefined,
        status: 'TODO',
        categoryId: 'default-category',
        dueDate: null
      })
    })

    it('handles whitespace-only description as undefined', () => {
      renderForm()

      fireEvent.change(screen.getByTestId('task-title-input'), { 
        target: { value: 'New Task' } 
      })
      fireEvent.change(screen.getByTestId('task-description-input'), { 
        target: { value: '   ' } 
      })
      
      fireEvent.click(screen.getByTestId('task-submit-button'))

      expect(mockOnSubmit).toHaveBeenCalledWith({
        title: 'New Task',
        description: undefined,
        status: 'TODO',
        categoryId: 'default-category',
        dueDate: null
      })
    })
  })

  it('handles cancel button click', () => {
    renderForm()
    fireEvent.click(screen.getByTestId('task-cancel-button'))
    expect(mockOnCancel).toHaveBeenCalled()
  })
})
