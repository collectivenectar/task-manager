import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import TaskBoard from '../TaskBoard'
import * as actions from '@/app/actions'
import { TaskStatus } from '@prisma/client'

// Mock the server actions
jest.mock('@/app/actions', () => ({
  createTask: jest.fn(),
  updateTaskStatus: jest.fn(),
  deleteTask: jest.fn(),
  moveTask: jest.fn(),
  getCategories: jest.fn(),
  getTasks: jest.fn(),
}))

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}))

describe('TaskBoard', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock default category
    const mockCategories = [{
      id: 'default-category',
      name: 'unassigned',
      isDefault: true,
      position: 0,
      userId: 'test-user',
      createdAt: new Date(),
      updatedAt: new Date()
    }]

    ;(actions.getCategories as jest.Mock).mockResolvedValue(mockCategories)
    ;(actions.getTasks as jest.Mock).mockResolvedValue([])
  })

  const renderTaskBoard = () => {
    return renderWithProviders(
      <TaskBoard userId="test-user" initialTasks={[]} />
    )
  }

  test('renders all status columns', async () => {
    renderTaskBoard()

    await waitFor(() => {
      expect(screen.getByText('Todo')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
    })
  })

  test('handles task creation', async () => {
    const mockTask = {
      id: 'task-1',
      title: 'New Task',
      status: 'TODO' as TaskStatus,
      categoryId: 'default-category',
      position: 1000,
      userId: 'test-user',
      description: null,
      dueDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    ;(actions.createTask as jest.Mock).mockResolvedValue(mockTask)
    renderTaskBoard()

    // Open create form
    const createButton = screen.getByTestId('create-task-button-todo')
    fireEvent.click(createButton)

    // Fill and submit form
    const titleInput = screen.getByTestId('task-title-input')
    fireEvent.change(titleInput, { target: { value: 'New Task' } })
    
    const submitButton = screen.getByTestId('task-submit-button')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(actions.createTask).toHaveBeenCalledWith(
        'test-user',
        expect.objectContaining({
          title: 'New Task'
        })
      )
    })
  })
})
