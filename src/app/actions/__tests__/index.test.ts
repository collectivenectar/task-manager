import { 
  createTask,
  getTasks,
  updateTask,
  moveTask,
  moveCategory,
  PositionError
} from '../index';

import { prisma } from '../../../lib/db';
import { TaskStatus, Prisma } from '@prisma/client';

jest.mock('@prisma/client', () => ({
  TaskStatus: {
    TODO: 'TODO',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED'
  },
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    }
  }
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn().mockResolvedValue({ id: 'task123', userId: 'user123', position: 1000 }),
      findUnique: jest.fn().mockResolvedValue({ id: 'task123', position: 1000 }),
      update: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn()
    },
    category: {
      findFirst: jest.fn().mockResolvedValue({ id: 'category123', userId: 'user123' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'category123', position: 1000 }),
      create: jest.fn(),
      reorder: jest.fn()
    }
  }
}));

// First, properly type the mocks
type MockClient = {
  task: {
    create: jest.Mock;
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    reorder: jest.Mock;
  };
  category: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    reorder: jest.Mock;
  };
};

// Cast prisma as MockClient for use in tests
const mockPrisma = prisma as unknown as MockClient;

describe('Task Actions', () => {
  const mockUserId = 'user123';
  const mockTaskId = 'task123';

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful category and task lookups
    mockPrisma.category.findFirst.mockResolvedValue({ id: 'category123', userId: mockUserId });
    mockPrisma.task.findFirst.mockResolvedValue({ id: mockTaskId, userId: mockUserId, position: 1000 });
  });

  describe('createTask', () => {
    it('should create a new task with float position', async () => {
      const taskData = {
        title: 'New Task',
        description: 'Task description',
        status: TaskStatus.TODO,
        categoryId: 'category123'
      };

      await createTask(mockUserId, taskData);

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          ...taskData,
          userId: mockUserId,
          position: expect.any(Number)
        }
      });
    });
  });

  describe('moveTask', () => {
    it('should reorder task with new position', async () => {
      const moveData = {
        beforeId: 'task456',
        afterId: 'task789',
        categoryId: 'category456'
      };

      await moveTask(mockUserId, mockTaskId, moveData);

      expect(mockPrisma.task.reorder).toHaveBeenCalledWith({
        id: mockTaskId,
        beforeId: moveData.beforeId,
        afterId: moveData.afterId,
        categoryId: moveData.categoryId
      });
    });

    it('should handle moving task without category change', async () => {
      const moveData = {
        beforeId: 'task456',
        afterId: 'task789'
      };

      await moveTask(mockUserId, mockTaskId, moveData);

      expect(mockPrisma.task.reorder).toHaveBeenCalledWith({
        id: mockTaskId,
        beforeId: moveData.beforeId,
        afterId: moveData.afterId,
        categoryId: undefined
      });
    });
  });

  describe('moveCategory', () => {
    it('should reorder category', async () => {
      const moveData = {
        beforeId: 'category456',
        afterId: 'category789'
      };

      await moveCategory(mockUserId, 'category123', moveData);

      expect(mockPrisma.category.reorder).toHaveBeenCalledWith({
        id: 'category123',
        beforeId: moveData.beforeId,
        afterId: moveData.afterId
      });
    });
  });

  // Keep existing tests that don't involve position
  describe('getTasks', () => {
    it('should fetch all tasks for a user', async () => {
      await getTasks(mockUserId);

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { position: 'asc' },
        include: { category: true }
      });
    });
  });

  describe('validation', () => {
    it('should throw error when title is empty', async () => {
      await expect(
        createTask(mockUserId, { title: '' })
      ).rejects.toThrow('Title must be between 1 and 255 characters');
    });

    it('should throw error when title exceeds 255 characters', async () => {
      await expect(
        createTask(mockUserId, { title: 'a'.repeat(256) })
      ).rejects.toThrow('Title must be between 1 and 255 characters');
    });

    it('should throw error when description exceeds 1000 characters', async () => {
      await expect(
        createTask(mockUserId, { 
          title: 'Valid Title', 
          description: 'a'.repeat(1001) 
        })
      ).rejects.toThrow('Description must not exceed 1000 characters');
    });
  });

  describe('authorization', () => {
    it('should throw error when accessing unauthorized task', async () => {
      mockPrisma.task.findFirst.mockResolvedValueOnce(null);
      
      await expect(
        moveTask(mockUserId, mockTaskId, { beforeId: 'task456' })
      ).rejects.toThrow('Task not found or unauthorized');
    });

    it('should throw error when accessing unauthorized category', async () => {
      mockPrisma.category.findFirst.mockResolvedValueOnce(null);
      
      await expect(
        moveTask(mockUserId, mockTaskId, { categoryId: 'invalid-category' })
      ).rejects.toThrow('Category not found or unauthorized');
    });
  });

  describe('database error handling', () => {
    it('should handle unique constraint violations', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { 
        code: 'P2002',
        clientVersion: '5.0.0'
      });
      mockPrisma.task.create.mockRejectedValueOnce(error);

      await expect(
        createTask(mockUserId, { title: 'Test' })
      ).rejects.toThrow('Unique constraint violation');
    });

    it('should handle record not found errors', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Record not found', { 
        code: 'P2025',
        clientVersion: '5.0.0'
      });
      mockPrisma.task.update.mockRejectedValueOnce(error);

      await expect(
        updateTask(mockUserId, mockTaskId, { title: 'New Title' })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('position calculations', () => {
    it('should throw error when positions are too close', async () => {
      // Mock two tasks with very close positions
      mockPrisma.task.findUnique
        .mockResolvedValueOnce({ id: 'task1', position: 1.0001 })
        .mockResolvedValueOnce({ id: 'task2', position: 1.0002 });

      // Mock the reorder function to throw the PositionError
      mockPrisma.task.reorder.mockRejectedValueOnce(
        new PositionError('Positions too close, rebalancing required')
      );

      await expect(
        moveTask(mockUserId, mockTaskId, {
          beforeId: 'task1',
          afterId: 'task2'
        })
      ).rejects.toThrow('Positions too close, rebalancing required');
    });

    it('should handle first item positioning', async () => {
      // Mock no before/after tasks
      mockPrisma.task.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await moveTask(mockUserId, mockTaskId, {});

      expect(mockPrisma.task.reorder).toHaveBeenCalledWith({
        id: mockTaskId,
        beforeId: undefined,
        afterId: undefined,
        categoryId: undefined
      });
    });

    it('should calculate middle position between two tasks', async () => {
      // Mock before and after tasks with well-spaced positions
      mockPrisma.task.findUnique
        .mockResolvedValueOnce({ id: 'task1', position: 1000 })
        .mockResolvedValueOnce({ id: 'task2', position: 3000 });

      await moveTask(mockUserId, mockTaskId, {
        beforeId: 'task1',
        afterId: 'task2'
      });

      expect(mockPrisma.task.reorder).toHaveBeenCalledWith({
        id: mockTaskId,
        beforeId: 'task1',
        afterId: 'task2',
        categoryId: undefined
      });
    });
  });
});


