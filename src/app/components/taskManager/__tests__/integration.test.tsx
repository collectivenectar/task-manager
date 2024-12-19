import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import TaskBoard from '../board/TaskBoard'
import * as actions from '@/app/actions'
import { TaskStatus, Task } from '@prisma/client'
import { toast } from 'react-toastify'
import { ValidationError } from '@/lib/errors'

// Mock the server actions
jest.mock('@/app/actions', () => ({
  createTask: jest.fn(),
  updateTaskStatus: jest.fn(),
  deleteTask: jest.fn(),
  moveTask: jest.fn(),
  getCategories: jest.fn(),
  getTasks: jest.fn(),
}))

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  },
  ToastContainer: () => null // Mock the component
}))

describe('Task Management Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock default category
    const mockCategories = [{
      id: 'default-category',
      name: 'Default',
      isDefault: true,
      position: 0,
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date()
    }]

    // Setup mock implementations
    ;(actions.getCategories as jest.Mock).mockResolvedValue(mockCategories)
    ;(actions.getTasks as jest.Mock).mockResolvedValue([])
  })

  const renderTaskBoard = () => {
    return renderWithProviders(
      <TaskBoard userId="test-user" initialTasks={[]} />
    )
  }

  const renderBoardWithTasks = async (tasks: Task[] = []) => {
    ;(actions.getTasks as jest.Mock).mockResolvedValue(tasks)
    
    const result = renderTaskBoard()
    
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
    })
    
    return result
  }

  test('complete task lifecycle: create, move, complete, delete', async () => {
    const mockTask = {
      id: 'task-1',
      title: 'Test Task',
      description: 'Test Description',
      status: 'TODO' as TaskStatus,
      categoryId: 'default-category',
      position: 1000,
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: null,
      category: null
    }

    ;(actions.createTask as jest.Mock).mockResolvedValue(mockTask)
    ;(actions.getTasks as jest.Mock).mockResolvedValue([mockTask])
    ;(actions.deleteTask as jest.Mock).mockResolvedValue(undefined)
    
    await renderBoardWithTasks([mockTask])

    // Create Task
    const createButton = screen.getByTestId('create-task-button-todo')
    fireEvent.click(createButton)

    // Fill form
    const titleInput = screen.getByTestId('task-title-input')
    const descriptionInput = screen.getByTestId('task-description-input')
    
    fireEvent.change(titleInput, { target: { value: 'Test Task' } })
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } })

    // Submit
    const submitButton = screen.getByTestId('task-submit-button')
    fireEvent.click(submitButton)

    // Verify task creation
    await waitFor(() => {
      expect(screen.getByTestId('task-card-task-1')).toBeInTheDocument()
    })

    // Update status
    const statusButton = screen.getByTestId('task-status-button')
    fireEvent.click(statusButton)

    // Delete task
    const taskCard = screen.getByTestId('task-card-task-1')
    fireEvent.click(taskCard)

    const deleteButton = screen.getByTestId('task-delete-button')
    fireEvent.click(deleteButton)

    const confirmButton = screen.getByTestId('confirm-delete-button')
    fireEvent.click(confirmButton)

    // After delete confirmation, mock empty task list
    ;(actions.getTasks as jest.Mock).mockResolvedValue([])
    
    // Verify deletion
    await waitFor(() => {
      expect(screen.queryByTestId('task-card-task-1')).not.toBeInTheDocument()
    })
  })

  test('handles task status update errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    const mockTask = {
      id: 'task-1',
      title: 'Test Task',
      status: 'TODO' as TaskStatus,
      categoryId: 'default-category',
      position: 1000,
      userId: 'test-user',
      description: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    ;(actions.getTasks as jest.Mock).mockResolvedValue([mockTask])
    ;(actions.updateTaskStatus as jest.Mock).mockRejectedValue(
      new Error('Failed to update status')
    )

    renderTaskBoard()

    // Wait for the task to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('task-card-task-1')).toBeInTheDocument()
    })

    // Try to update status
    const statusButton = screen.getByTestId('task-status-button')
    fireEvent.click(statusButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update status:',
        expect.any(Error)
      )
      expect(toast.error).toHaveBeenCalledWith('Failed to update status')
    }, {
      timeout: 3000
    })

    consoleSpy.mockRestore()
  })

  describe('Error Handling', () => {
    test('handles validation errors', async () => {
      // Mock a validation error with actual message from validateTitle
      ;(actions.createTask as jest.Mock).mockRejectedValue(
        new ValidationError('Title must be between 1 and 255 characters')
      )
      
      renderTaskBoard()

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
      })

      // Open create form
      const createButton = screen.getByTestId('create-task-button-todo')
      fireEvent.click(createButton)
      
      // Submit empty form
      const submitButton = screen.getByTestId('task-submit-button')
      fireEvent.click(submitButton)

      // Should show actual validation error message
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Title must be between 1 and 255 characters')
      })
    })

    test('handles generic errors', async () => {
      // Mock a generic error
      ;(actions.createTask as jest.Mock).mockRejectedValue(
        new Error('Failed to create task')
      )
      
      renderTaskBoard()

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
      })

      // Open create form
      const createButton = screen.getByTestId('create-task-button-todo')
      fireEvent.click(createButton)
      
      // Fill form
      const titleInput = screen.getByTestId('task-title-input')
      fireEvent.change(titleInput, { target: { value: 'Test Task' } })
      
      // Submit form
      const submitButton = screen.getByTestId('task-submit-button')
      fireEvent.click(submitButton)

      // Should show generic error message
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to create task')
      })
    })
  })
})