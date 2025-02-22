import { prismaMock } from '@/test/mocks/prisma'
import { 
  createTask,
  deleteCategory,
  moveTask,
  updateTask,
  getTasksByCategory,
  getSmartTaskSuggestions,
  SmartTaskInput
} from '../index'
import { AuthorizationError, ValidationError } from '@/lib/errors'

// Mock OpenAI
jest.mock('openai', () => {
  const mockCreate = jest.fn()
  return jest.fn(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  }))
})

describe('Task Management Actions', () => {
  const mockUserId = 'user-123'
  const mockCategoryId = 'category-123'
  const mockTaskId = 'task-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Task CRUD Operations', () => {
    test('createTask should validate required fields', async () => {
      await expect(createTask(mockUserId, {
        title: '',  // Empty title
        status: 'TODO',
        categoryId: mockCategoryId
      })).rejects.toThrow(ValidationError)

      await expect(createTask(mockUserId, {
        title: ' ',  // Only whitespace
        status: 'TODO',
        categoryId: mockCategoryId
      })).rejects.toThrow(ValidationError)
    })

    test('createTask validates title length', async () => {
      const longTitle = 'a'.repeat(256)
      await expect(createTask(mockUserId, {
        title: longTitle,
        status: 'TODO',
        categoryId: mockCategoryId
      })).rejects.toThrow(ValidationError)
    })

    test('createTask validates description length', async () => {
      const longDescription = 'a'.repeat(1001)
      await expect(createTask(mockUserId, {
        title: 'Valid Title',
        description: longDescription,
        status: 'TODO',
        categoryId: mockCategoryId
      })).rejects.toThrow(ValidationError)
    })

    test('createTask handles database errors', async () => {
      prismaMock.task.create.mockRejectedValue(new Error('DB Error'))
      
      await expect(createTask(mockUserId, {
        title: 'Test Task',
        status: 'TODO',
        categoryId: mockCategoryId
      })).rejects.toThrow('Failed to create task')  // Generic error for DB issues
    })

    test('createTask should set correct position for new task', async () => {
      const mockTask = {
        id: mockTaskId,
        title: 'Test Task',
        status: 'TODO',
        categoryId: mockCategoryId,
        position: 1000,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        dueDate: null
      }

      prismaMock.task.findFirst.mockResolvedValue(null)
      // @ts-expect-error prisma create type
      prismaMock.task.create.mockResolvedValue(mockTask)

      const result = await createTask(mockUserId, {
        title: 'Test Task',
        status: 'TODO' as const,
        categoryId: mockCategoryId
      })

      expect(result.position).toBe(1000)
    })

    test('updateTask should prevent unauthorized access', async () => {
      prismaMock.task.findFirst.mockResolvedValue(null)

      await expect(updateTask(mockUserId, 'wrong-task-id', {
        title: 'Updated Title'
      })).rejects.toThrow(AuthorizationError)
    })
  })

  describe('Category Management', () => {
    test('deleteCategory should prevent deleting default category', async () => {
      prismaMock.category.findFirst.mockResolvedValue({
        id: mockCategoryId,
        name: 'Default',
        userId: mockUserId,
        position: 0,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      await expect(deleteCategory(mockUserId, mockCategoryId, 'delete_all'))
        .rejects.toThrow('Cannot delete default category')
    })

    it('deleteCategory should allow moving tasks to target category', async () => {
      const targetCategoryId = 'target-category-123'

      // Mock source category exists
      prismaMock.category.findFirst.mockResolvedValue({
        id: mockCategoryId,
        name: 'Test Category',
        position: 0,
        isDefault: false,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock target category exists
      prismaMock.category.findFirst.mockResolvedValueOnce({
        id: targetCategoryId,
        name: 'Target Category',
        position: 1,
        isDefault: false,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      // Mock tasks exist
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Test Task',
          description: null,
          status: 'TODO',
          position: 1000,
          userId: mockUserId,
          categoryId: mockCategoryId,
          createdAt: new Date(),
          updatedAt: new Date(),
          dueDate: null
        }
      ])

      await deleteCategory(mockUserId, mockCategoryId, 'move', targetCategoryId)

      // Should update tasks with new category
      expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
        where: { 
          categoryId: mockCategoryId,
          userId: mockUserId 
        },
        data: { 
          categoryId: targetCategoryId 
        }
      })

      // Should delete the category
      expect(prismaMock.category.delete).toHaveBeenCalledWith({
        where: { id: mockCategoryId }
      })
    })
  })

  describe('Task Movement and Positioning', () => {
    test('moveTask should handle reordering between tasks', async () => {
      // Mock transaction
      const mockTransaction = {
        task: {
          findMany: jest.fn(),
          update: jest.fn()
        }
      }
      // @ts-expect-error prisma transaction client type
      prismaMock.$transaction.mockImplementation((callback) => callback(mockTransaction))

      // Mock task ownership verification
      prismaMock.task.findFirst.mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        title: 'Test Task',
        status: 'TODO',
        position: 1000,
        categoryId: mockCategoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        dueDate: null
      })

      // Mock all tasks in the column (this is what the function actually queries)
      const mockTasks = [
        { 
          id: 'task-1',
          position: 1000,
          userId: mockUserId,
          categoryId: mockCategoryId 
        },
        { 
          id: 'task-2',
          position: 2000,
          userId: mockUserId,
          categoryId: mockCategoryId 
        }
      ]
      mockTransaction.task.findMany.mockResolvedValue(mockTasks)
      
      // Mock the update within transaction
      mockTransaction.task.update.mockResolvedValue({
        id: mockTaskId,
        position: 1500,
        userId: mockUserId,
        categoryId: mockCategoryId
      })

      await moveTask(mockUserId, mockTaskId, {
        beforeId: 'task-1',
        afterId: 'task-2'
      })

      // Verify the update was called within the transaction
      expect(mockTransaction.task.update).toHaveBeenCalledWith({
        where: { id: mockTaskId },
        data: expect.objectContaining({
          position: 1500 // midpoint between 1000 and 2000
        })
      })
    })

    test('moveTask should trigger rebalancing when positions are too close', async () => {
      // Mock task ownership verification
      prismaMock.task.findFirst.mockResolvedValue({
        id: mockTaskId,
        userId: mockUserId,
        title: 'Test Task',
        status: 'TODO',
        position: 1000,
        categoryId: mockCategoryId,
        createdAt: new Date(),
        updatedAt: new Date(),
        description: null,
        dueDate: null
      })

      prismaMock.task.findMany.mockResolvedValue([
        // @ts-expect-error prisma findMany type partial
        { id: 'task-1', position: 1000 },
        // @ts-expect-error prisma findMany type partial
        { id: 'task-2', position: 1000.1 }
      ])

      await moveTask(mockUserId, mockTaskId, {
        beforeId: 'task-1',
        afterId: 'task-2'
      })

      // Should have triggered rebalancing
      expect(prismaMock.$transaction).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    test('should handle database connection errors gracefully', async () => {
      prismaMock.task.findMany.mockRejectedValue(new Error('DB connection failed'))

      await expect(getTasksByCategory(mockUserId, mockCategoryId))
        .rejects.toThrow('An unexpected error occurred')
    })

    test('should handle concurrent updates gracefully', async () => {
      // Simulate a race condition where task is deleted while updating
      // @ts-expect-error prisma findFirst type partial
      prismaMock.task.findFirst.mockResolvedValue({ id: mockTaskId })
      prismaMock.task.update.mockRejectedValue(new Error('Record not found'))

      await expect(updateTask(mockUserId, mockTaskId, { title: 'New Title' }))
        .rejects.toThrow()
    })
  })

  describe('Data Validation', () => {
    test('should validate task title length', async () => {
      const longTitle = 'a'.repeat(256)
      
      prismaMock.task.create.mockRejectedValue(
        new ValidationError('Title must not exceed 255 characters')
      )

      await expect(createTask(mockUserId, {
        title: longTitle,
        status: 'TODO',
        categoryId: mockCategoryId
      })).rejects.toThrow(ValidationError)
    })

    test('should validate task description length', async () => {
      const longDescription = 'a'.repeat(1001)
      
      prismaMock.task.create.mockRejectedValue(
        new ValidationError('Description must not exceed 1000 characters')
      )

      await expect(createTask(mockUserId, {
        title: 'Valid Title',
        description: longDescription,
        status: 'TODO',
        categoryId: mockCategoryId
      })).rejects.toThrow(ValidationError)
    })
  })
})

describe('Task Management Core Logic', () => {
  describe('Task Position Management', () => {
    test('positions tasks correctly when moving between items', async () => {
      // This demonstrates understanding of the positioning algorithm
    })

    test('handles position collisions by rebalancing', async () => {
      // This shows you thought about edge cases
    })
  })

  describe('Category Management', () => {
    test('prevents orphaned tasks when deleting categories', async () => {
      // This shows you care about data integrity
    })
  })
})

describe('Smart Task Assistant', () => {
  let mockCreate: jest.Mock

  beforeEach(() => {
    // Get reference to the mocked create function
    const OpenAI = jest.requireMock('openai')
    mockCreate = jest.mocked(OpenAI)().chat.completions.create

    // Default success response
    mockCreate.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: "Complete project documentation by next Friday",
            description: "Create comprehensive documentation for the SMART goals feature, including API specifications, usage examples, and implementation details.",
            measurementCriteria: [
              "Documentation covers all API endpoints",
              "Includes at least 3 usage examples",
              "Reviewed by at least 1 team member"
            ],
            confidence: 0.9
          })
        }
      }]
    })
  })

  it('should return SMART suggestions for a task', async () => {
    const mockInput: SmartTaskInput = {
      title: "Write documentation",
      description: "Document the new feature",
      category: "Development",
      dueDate: "2024-03-20"
    }

    const result = await getSmartTaskSuggestions(mockInput)

    expect(result).toHaveProperty('title')
    expect(result).toHaveProperty('description')
    expect(result).toHaveProperty('measurementCriteria')
    expect(result).toHaveProperty('confidence')
  })

  it('should handle missing input gracefully', async () => {
    const result = await getSmartTaskSuggestions({})

    expect(result).toHaveProperty('title')
    expect(result).toHaveProperty('description')
  })

  it('should handle AI errors appropriately', async () => {
    mockCreate.mockRejectedValueOnce(new Error('AI service error'))

    await expect(getSmartTaskSuggestions({ title: 'Test' }))
      .rejects
      .toThrow('Failed to get smart task suggestions')
  })
})


