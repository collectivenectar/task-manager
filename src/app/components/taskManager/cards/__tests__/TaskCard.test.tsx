import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import TaskCard from '../TaskCard'

describe('TaskCard', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    status: 'TODO' as const,
    position: 1000,
    userId: 'user-1',
    categoryId: 'category-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    dueDate: null,
    category: {
      id: 'category-1',
      name: 'Test Category',
      position: 0,
      isDefault: true,
      userId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  const mockProps = {
    task: mockTask,
    userId: 'user-1',
    onEdit: jest.fn(),
    onStatusChange: jest.fn().mockResolvedValue(undefined),
    isAllView: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders task details correctly', () => {
    renderWithProviders(<TaskCard {...mockProps} />)

    expect(screen.getByTestId('task-title')).toHaveTextContent('Test Task')
    expect(screen.getByTestId('task-description')).toHaveTextContent('Test Description')
    expect(screen.getByTestId('task-category')).toHaveTextContent('Test Category')
  })

  it('handles status change click', async () => {
    jest.useFakeTimers()
    renderWithProviders(<TaskCard {...mockProps} />)
    
    const statusButton = screen.getByTestId('task-status-button')
    fireEvent.click(statusButton)

    // Should show loading indicator
    expect(screen.getByTestId('status-loading-indicator')).toBeInTheDocument()
    
    // Fast-forward through loading animation
    jest.advanceTimersByTime(2000)
    
    await waitFor(() => {
      expect(mockProps.onStatusChange).toHaveBeenCalledWith(
        mockTask.id,
        'IN_PROGRESS' // TODO -> IN_PROGRESS
      )
    })

    jest.useRealTimers()
  })

  it('calls onEdit when clicked', () => {
    renderWithProviders(<TaskCard {...mockProps} />)
    
    const card = screen.getByTestId(`task-card-${mockTask.id}`)
    fireEvent.click(card)

    expect(mockProps.onEdit).toHaveBeenCalledWith(mockTask)
  })

  it('displays drag handle when not in all view', () => {
    renderWithProviders(<TaskCard {...mockProps} dragHandleProps={{
      'aria-describedby': 'drag-handle',
      draggable: true,
      role: 'button',
      tabIndex: 0
    }} />)
    
    const dragHandle = screen.getByRole('button', { name: /drag to reorder/i })
    expect(dragHandle).toBeInTheDocument()
  })

  it('hides drag handle in all view', () => {
    renderWithProviders(<TaskCard {...mockProps} isAllView={true} />)
    
    const dragHandle = screen.queryByRole('button', { name: /drag to reorder/i })
    expect(dragHandle).not.toBeInTheDocument()
  })
}) 