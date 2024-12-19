import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TaskForm from '../TaskForm'
import { Category, Task, TaskStatus } from '@prisma/client'
import { alerts } from '@/lib/utils/alerts'
import { getTasksByCategory, deleteCategory } from '@/app/actions'

// Mock dependencies
jest.mock('@/lib/utils/alerts', () => ({
  alerts: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn(),
  }
}))

jest.mock('@/app/actions', () => ({
  getTasksByCategory: jest.fn(),
  deleteCategory: jest.fn(),
}))

describe('TaskForm', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  const defaultProps = {
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    onDelete: jest.fn(),
    onCategoryCreate: jest.fn(),
    userId: 'user123',
    categories: [
      { id: 'default', name: 'Default', isDefault: true },
      { id: 'work', name: 'Work', isDefault: false },
    ] as Category[],
  }

  const renderForm = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TaskForm {...defaultProps} {...props} />
      </QueryClientProvider>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the form with all fields', () => {
    renderForm()

    expect(screen.getByTestId('task-form')).toBeInTheDocument()
    expect(screen.getByTestId('task-title-input')).toBeInTheDocument()
    expect(screen.getByTestId('task-description-input')).toBeInTheDocument()
    expect(screen.getByTestId('task-status-select')).toBeInTheDocument()
    expect(screen.getByTestId('task-submit-button')).toBeInTheDocument()
    expect(screen.getByTestId('task-cancel-button')).toBeInTheDocument()
  })

  it('submits the form with valid data', async () => {
    const onSubmit = jest.fn()
    renderForm({ onSubmit })

    const titleInput = screen.getByTestId('task-title-input')
    const descriptionInput = screen.getByTestId('task-description-input')
    const statusSelect = screen.getByTestId('task-status-select')
    
    fireEvent.change(titleInput, { target: { value: 'Test Task' } })
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } })
    fireEvent.change(statusSelect, { target: { value: 'IN_PROGRESS' } })
    
    fireEvent.submit(screen.getByTestId('task-form'))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Test Task',
      description: 'Test Description',
      status: 'IN_PROGRESS',
      dueDate: null,
      categoryId: 'default'
    })
  })

  it('shows validation error for empty title', async () => {
    renderForm()

    fireEvent.submit(screen.getByTestId('task-form'))

    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(defaultProps.onSubmit).not.toHaveBeenCalled()
  })

  it('pre-fills form with initial data', () => {
    const initialData: Task = {
      id: 'task1',
      title: 'Existing Task',
      description: 'Existing Description',
      status: 'IN_PROGRESS' as TaskStatus,
      dueDate: new Date('2024-03-20'),
      categoryId: 'work',
      userId: 'user123',
      position: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    renderForm({ initialData })

    expect(screen.getByTestId('task-title-input')).toHaveValue('Existing Task')
    expect(screen.getByTestId('task-description-input')).toHaveValue('Existing Description')
    expect(screen.getByTestId('task-status-select')).toHaveValue('IN_PROGRESS')
  })

  it('handles category creation', async () => {
    const onCategoryCreate = jest.fn().mockResolvedValue({ 
      id: 'new-cat', 
      name: 'New Category',
      isDefault: false 
    })
    
    renderForm({ onCategoryCreate })

    // Click add category button
    fireEvent.click(screen.getByText('+ Add Category'))
    
    // Fill in new category name
    const input = screen.getByPlaceholderText('New category name')
    fireEvent.change(input, { target: { value: 'New Category' } })
    
    // Click add button
    fireEvent.click(screen.getByText('Add'))

    await waitFor(() => {
      expect(onCategoryCreate).toHaveBeenCalledWith({ 
        name: 'New Category' 
      })
    })
  })

  it('handles category deletion', async () => {
    const mockGetTasksByCategory = getTasksByCategory as jest.Mock
    mockGetTasksByCategory.mockResolvedValue([
      { 
        id: 'task1', 
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        categoryId: 'work',
        userId: 'user123',
        position: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ])

    // Set up the query client with initial data
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })
    queryClient.setQueryData(['tasks', 'category', 'work'], [
      { 
        id: 'task1', 
        title: 'Test Task',
        description: 'Test Description',
        status: 'TODO',
        categoryId: 'work',
        userId: 'user123',
        position: 1000,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ])

    render(
      <QueryClientProvider client={queryClient}>
        <TaskForm {...defaultProps} />
      </QueryClientProvider>
    )

    // First click the delete icon for the Work category
    const deleteWorkButton = screen.getByRole('button', { name: /Delete Work/i })
    fireEvent.click(deleteWorkButton)

    // Wait for the modal to appear and then find the delete button
    await waitFor(() => {
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Delete Category')
    })

    // Now try to find and click the delete button
    const deleteAllButton = screen.getByTestId('delete-category-and-tasks-button')
    fireEvent.click(deleteAllButton)

    await waitFor(() => {
      expect(deleteCategory).toHaveBeenCalled()
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    renderForm()
    
    fireEvent.click(screen.getByTestId('task-cancel-button'))
    
    expect(defaultProps.onCancel).toHaveBeenCalled()
  })

  it('calls onDelete when delete button is clicked and confirmed', async () => {
    const initialData: Task = {
      id: 'task1',
      title: 'Test Task',
      description: 'Test Description',
      status: 'TODO' as TaskStatus,
      dueDate: null,
      categoryId: 'default',
      userId: 'user123',
      position: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    renderForm({ initialData })

    // Click the delete task button
    fireEvent.click(screen.getByTestId('task-delete-button'))

    // Click the confirm delete button in the modal
    fireEvent.click(screen.getByTestId('confirm-delete-button'))

    expect(defaultProps.onDelete).toHaveBeenCalledWith('task1')
  })
})
