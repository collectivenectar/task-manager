import { 
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  updateTaskTitle,
  updateTaskDescription,
  updateTaskStatus,
  updateTaskCategory,
  updateTaskPosition
} from '../index';

import { prisma } from '../../../lib/db';

jest.mock('@/lib/db', () => ({
  prisma: {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn()
    }
  }
}))

describe('Task Actions', () => {
  const mockUserId = 'user123'
  const mockTaskId = 'task123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createTask', () => {
    it('should create a new task with required fields', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description'
      }

      await createTask(mockUserId, taskData)

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          ...taskData,
          userId: mockUserId
        }
      })
    })
  })

  describe('getTasks', () => {
    it('should fetch all tasks for a user', async () => {
      const mockTasks = [
        { id: '1', title: 'Task 1' },
        { id: '2', title: 'Task 2' }
      ]

      prisma.task.findMany.mockResolvedValue(mockTasks)

      const result = await getTasks(mockUserId)

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { position: 'asc' }
      })
      expect(result).toEqual(mockTasks)
    })
  })

  describe('getTask', () => {
    it('should fetch a single task with user verification', async () => {
      const mockTask = { id: mockTaskId, title: 'Task' }

      prisma.task.findFirst.mockResolvedValue(mockTask)

      const result = await getTask(mockUserId, mockTaskId)

      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: { id: mockTaskId, userId: mockUserId }
      })
      expect(result).toEqual(mockTask)
    })
  })

  describe('updateTask', () => {
    it('should update multiple fields of a task', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'IN_PROGRESS'
      }

      await updateTask(mockUserId, mockTaskId, updateData)

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: mockTaskId, userId: mockUserId },
        data: updateData
      })
    })
  })

  describe('individual field updates', () => {
    it('should update task title', async () => {
      await updateTaskTitle(mockUserId, mockTaskId, 'New Title')
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: mockTaskId, userId: mockUserId },
        data: { title: 'New Title' }
      })
    })

    it('should update task description', async () => {
      await updateTaskDescription(mockUserId, mockTaskId, 'New Description')
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: mockTaskId, userId: mockUserId },
        data: { description: 'New Description' }
      })
    })

    it('should update task status', async () => {
      await updateTaskStatus(mockUserId, mockTaskId, 'COMPLETED')
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: mockTaskId, userId: mockUserId },
        data: { status: 'COMPLETED' }
      })
    })

    it('should update task category', async () => {
      await updateTaskCategory(mockUserId, mockTaskId, 'WORK')
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: mockTaskId, userId: mockUserId },
        data: { category: 'WORK' }
      })
    })

    it('should update task position', async () => {
      await updateTaskPosition(mockUserId, mockTaskId, 2)
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: mockTaskId, userId: mockUserId },
        data: { position: 2 }
      })
    })
  })

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      await deleteTask(mockUserId, mockTaskId)

      expect(prisma.task.deleteMany).toHaveBeenCalledWith({
        where: { id: mockTaskId, userId: mockUserId }
      })
    })
  })

  describe('error handling', () => {
    it('should handle database errors when creating task', async () => {
      prisma.task.create.mockRejectedValue(new Error('DB Error'))
      await expect(createTask(mockUserId, { title: 'Task' })).rejects.toThrow('DB Error')
    })
  })
  
  describe('input validation', () => {
    it('should require title when creating task', async () => {
      const invalidData = { description: 'only description', title: '' }
      await expect(createTask(mockUserId, invalidData)).rejects.toThrow()
    })
  })
  
  describe('position updates', () => {
    it('should handle reordering multiple tasks', async () => {
      await updateTaskPosition(mockUserId, mockTaskId, 1)
      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: mockTaskId, userId: mockUserId },
        data: { position: 1 }
      })
    })
  })
})


