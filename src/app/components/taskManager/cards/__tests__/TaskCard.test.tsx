import { render, screen, fireEvent } from '@testing-library/react'
import TaskCard from '../TaskCard'
import { TaskStatus } from 'prisma/prisma-client'

describe('TaskCard', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as TaskStatus,
    categoryId: 'category-1',
    position: 1000,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    dueDate: null,
    category: null
  }

  const mockOnEdit = jest.fn()
  const mockOnStatusChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders task details correctly', () => {
    render(
      <TaskCard
        task={mockTask}
        userId="user-1"
        onEdit={mockOnEdit}
        onStatusChange={mockOnStatusChange}
        isAllView={false}
      />
    )

    expect(screen.getByTestId(`task-card-${mockTask.id}`)).toBeInTheDocument()
    expect(screen.getByTestId('task-title')).toHaveTextContent('Test Task')
    expect(screen.getByTestId('task-status-button')).toHaveTextContent('TODO')
  })

  it('calls onEdit when card is clicked', () => {
    render(
      <TaskCard
        task={mockTask}
        userId="user-1"
        onEdit={mockOnEdit}
        onStatusChange={mockOnStatusChange}
        isAllView={false}
      />
    )

    fireEvent.click(screen.getByTestId(`task-card-${mockTask.id}`))
    expect(mockOnEdit).toHaveBeenCalledWith(mockTask)
  })

  it('calls onStatusChange when status button is clicked', async () => {
    jest.useFakeTimers()
    
    render(
      <TaskCard
        task={mockTask}
        userId="user-1"
        onEdit={mockOnEdit}
        onStatusChange={mockOnStatusChange}
        isAllView={false}
      />
    )

    fireEvent.click(screen.getByTestId('task-status-button'))
    
    // Fast-forward through the animation
    jest.advanceTimersByTime(2000)
    
    expect(mockOnStatusChange).toHaveBeenCalledWith(mockTask.id, 'IN_PROGRESS')
    
    jest.useRealTimers()
  })

  it('shows due date when present', () => {
    const taskWithDueDate = {
      ...mockTask,
      dueDate: new Date('2024-12-31')
    }

    render(
      <TaskCard
        task={taskWithDueDate}
        userId="user-1"
        onEdit={mockOnEdit}
        onStatusChange={mockOnStatusChange}
        isAllView={false}
      />
    )

    expect(screen.getByTestId('task-due-date')).toBeInTheDocument()
  })

  it('shows description when present', () => {
    render(
      <TaskCard
        task={mockTask}
        userId="user-1"
        onEdit={mockOnEdit}
        onStatusChange={mockOnStatusChange}
        isAllView={false}
      />
    )

    expect(screen.getByTestId('task-description')).toHaveTextContent('Test Description')
  })
}) 