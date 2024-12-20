import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import TaskBoard from '../TaskBoard'
import * as actions from '@/app/actions'

jest.mock('@/lib/utils/alerts', () => ({
  alerts: {
    error: jest.fn(),
    success: jest.fn(),
    info: jest.fn()
  }
}))

// Mock the server actions
jest.mock('@/app/actions', () => ({
  getCategories: jest.fn(),
  getTasks: jest.fn(),
  updateTaskStatus: jest.fn()
}))

describe('TaskBoard', () => {
  const mockTasks = [
    {
      id: 'task-1',
      title: 'Work Task',
      description: 'Work Description',
      status: 'TODO' as const,
      position: 1000,
      userId: 'user-1',
      categoryId: 'category-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: null,
      category: {
        id: 'category-1',
        name: 'Work',
        position: 0,
        isDefault: false,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'task-2',
      title: 'Personal Task',
      description: 'Personal Description',
      status: 'IN_PROGRESS' as const,
      position: 2000,
      userId: 'user-1',
      categoryId: 'category-2',
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: null,
      category: {
        id: 'category-2',
        name: 'Personal',
        position: 1,
        isDefault: false,
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  ]

  const mockDefaultCategory = {
    id: 'default-category',
    name: 'unassigned',
    position: 0,
    isDefault: true,
    userId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const defaultProps = {
    initialTasks: mockTasks,
    userId: 'user-1'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock default responses
    ;(actions.getCategories as jest.Mock).mockResolvedValue([mockDefaultCategory])
    ;(actions.getTasks as jest.Mock).mockResolvedValue(mockTasks)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const renderAndWaitForLoad = async () => {
    const result = renderWithProviders(<TaskBoard {...defaultProps} />)
    
    // Wait for loading skeleton to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument()
    })

    return result
  }

  describe('Rendering', () => {
    it('renders all status tabs', async () => {
      await renderAndWaitForLoad()
      
      // Use data-testid for "all" since it's not a tab
      expect(screen.getByTestId('status-tab-all')).toBeInTheDocument()
      
      // Check for the actual tabs
      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(3)
      expect(tabs[0]).toHaveTextContent(/todo/i)
      expect(tabs[1]).toHaveTextContent(/in progress/i)
      expect(tabs[2]).toHaveTextContent(/completed/i)
    })
  })

  describe('Filtering', () => {
    it('filters by search text', async () => {
      await renderAndWaitForLoad()

      const searchInput = screen.getByPlaceholderText(/search tasks/i)
      fireEvent.change(searchInput, { target: { value: 'Work' } })

      await waitFor(() => {
        expect(screen.getByText('Work Task')).toBeInTheDocument()
        expect(screen.queryByText('Personal Task')).not.toBeInTheDocument()
      })
    })

    it('filters by status', async () => {
      await renderAndWaitForLoad()

      const todoTab = screen.getByRole('tab', { name: /todo/i })
      fireEvent.click(todoTab)

      await waitFor(() => {
        expect(screen.getByText('Work Task')).toBeInTheDocument()
        expect(screen.queryByText('Personal Task')).not.toBeInTheDocument()
      })
    })
  })
})
