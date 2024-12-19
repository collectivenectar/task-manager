import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import TaskColumn from '../TaskColumn'
import { DragDropContext, Droppable } from '@hello-pangea/dnd'

// Wrap component with DragDropContext for testing
const renderWithDragDrop = (ui: React.ReactNode) => {
  return renderWithProviders(
    <DragDropContext onDragEnd={() => {}}>
      <Droppable droppableId="test-droppable">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            {ui}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}

describe('TaskColumn', () => {
  const mockTasks = [
    {
      id: 'task-1',
      title: 'Task 1',
      description: 'Description 1',
      status: 'TODO' as const,
      position: 1000,
      userId: 'user-1',
      categoryId: 'category-1',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date(),
      dueDate: new Date('2024-01-01'),
      category: {
        id: 'category-1',
        name: 'Test Category',
        position: 0,
        isDefault: false,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'task-2',
      title: 'Task 2',
      description: 'Description 2',
      status: 'TODO' as const,
      position: 2000,
      userId: 'user-1',
      categoryId: 'category-1',
      createdAt: new Date('2023-01-02'),
      updatedAt: new Date(),
      dueDate: new Date('2024-01-02'),
      category: null
    }
  ]

  const mockCategories = [{
    id: 'category-1',
    name: 'Test Category',
    position: 0,
    isDefault: true,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  }]

  const mockProps = {
    tasks: mockTasks,
    onReorder: jest.fn(),
    status: 'TODO' as const,
    userId: 'user-1',
    categories: mockCategories,
    onEditTask: jest.fn(),
    onStatusChange: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders tasks in the column', () => {
    renderWithDragDrop(<TaskColumn {...mockProps} />)
    
    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })

  it('renders sort buttons in ALL view', () => {
    renderWithDragDrop(<TaskColumn {...mockProps} status="ALL" />)
    
    expect(screen.getByText('Due Date')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
  })

  it('sorts tasks by due date when clicked', () => {
    renderWithDragDrop(<TaskColumn {...mockProps} status="ALL" />)
    
    const dueDateButton = screen.getByText('Due Date')
    fireEvent.click(dueDateButton)

    // Check tasks are in correct order
    const tasks = screen.getAllByTestId(/^task-card/)
    expect(tasks[0]).toHaveTextContent('Task 1') // Earlier due date
    expect(tasks[1]).toHaveTextContent('Task 2')
  })

  it('reverses sort order when clicking sort button twice', () => {
    renderWithDragDrop(<TaskColumn {...mockProps} status="ALL" />)
    
    const dueDateButton = screen.getByText('Due Date')
    fireEvent.click(dueDateButton)
    fireEvent.click(dueDateButton)

    const tasks = screen.getAllByTestId(/^task-card/)
    expect(tasks[0]).toHaveTextContent('Task 2') // Later due date
    expect(tasks[1]).toHaveTextContent('Task 1')
  })

  it('opens task creation modal when clicking add button', () => {
    renderWithDragDrop(<TaskColumn {...mockProps} />)
    
    const addButton = screen.getByRole('button', { name: /add task/i })
    fireEvent.click(addButton)

    expect(screen.getByText(/add task to todo/i)).toBeInTheDocument()
  })

  it('hides sort buttons in non-ALL views', () => {
    renderWithDragDrop(<TaskColumn {...mockProps} status="TODO" />)
    
    expect(screen.queryByText('Due Date')).not.toBeInTheDocument()
    expect(screen.queryByText('Created')).not.toBeInTheDocument()
  })

  it('makes tasks draggable in non-ALL views', () => {
    renderWithDragDrop(
      <TaskColumn 
        {...mockProps} 
        status="TODO"
        tasks={mockTasks.map((task, index) => ({
          ...task,
          dragHandleProps: {
            'data-rfd-drag-handle-context-id': ':r17:',
            'data-rfd-drag-handle-draggable-id': `task-${index}`,
            draggable: false,
            role: 'button',
            tabIndex: 0,
            'aria-describedby': 'rfd-hidden-text-:r17:-hidden-text-:r18:'
          }
        }))}
      />
    )
    
    const taskCards = screen.getAllByTestId(/^task-card/)
    taskCards.forEach(card => {
      // Look for the drag handle button with the correct attributes
      const dragHandle = card.querySelector('[data-rfd-drag-handle-draggable-id]')
      expect(dragHandle).toBeInTheDocument()
    })
  })

  it('makes tasks non-draggable in ALL view', () => {
    renderWithDragDrop(<TaskColumn {...mockProps} status="ALL" />)
    
    const taskCards = screen.getAllByTestId(/^task-card/)
    taskCards.forEach(card => {
      const dragHandle = card.querySelector('[data-rfd-drag-handle-draggable-id]')
      expect(dragHandle).not.toBeInTheDocument()
    })
  })
})
