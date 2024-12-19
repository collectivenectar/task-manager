import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import TaskColumn from '../TaskColumn'
import { TaskStatus } from '@prisma/client'
import { toast } from 'react-toastify'

jest.mock('react-toastify', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}))

describe('TaskColumn', () => {
  const mockTasks = [{
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
  }]

  const mockOnReorder = jest.fn()
  const mockOnStatusChange = jest.fn()
  const mockOnEditTask = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('handles task status update errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    mockOnStatusChange.mockRejectedValue(new Error('Failed to update status'))

    renderWithProviders(
      <TaskColumn
        tasks={mockTasks}
        onReorder={mockOnReorder}
        status="TODO"
        userId="test-user"
        categories={[]}
        onEditTask={mockOnEditTask}
        onStatusChange={mockOnStatusChange}
      />
    )

    const statusButton = screen.getByTestId('task-status-button')
    fireEvent.click(statusButton)

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to update status:',
        expect.any(Error)
      )
      expect(toast.error).toHaveBeenCalledWith('Failed to update status')
    })

    consoleSpy.mockRestore()
  })

  test('renders correct column title based on status', () => {
    renderWithProviders(
      <TaskColumn
        tasks={[]}
        onReorder={mockOnReorder}
        status="IN_PROGRESS"
        userId="test-user"
        categories={[]}
        onEditTask={mockOnEditTask}
        onStatusChange={mockOnStatusChange}
      />
    )

    expect(screen.getByText('In Progress')).toBeInTheDocument()
  })
})
