'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { Prisma, TaskStatus, Task } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ValidationError, AuthorizationError, PositionError } from '@/lib/errors'
import { categorySchema } from '@/lib/schemas/category'
import { TaskFormData, taskSchema } from '@/lib/schemas/task'
// User management
export async function getOrCreateDBUser() {
  const { userId } = await auth()
  if (!userId) {
    throw new AuthorizationError('Not authenticated')
  }

  // Try to find existing user
  let dbUser = await prisma.user.findUnique({
    where: { id: userId }
  })

  // If user doesn't exist in our database, create them
  if (!dbUser) {
    const user = await currentUser()
    dbUser = await prisma.user.create({
      data: {
        id: userId,
        email: user?.emailAddresses[0]?.emailAddress || '',
        name: user?.firstName || 'Anonymous'
      }
    })
  }

  return dbUser
}

// Input validation helpers
const validateTitle = (title: string) => {
  if (!title?.trim() || title.length > 255) {
    throw new ValidationError('Title must be between 1 and 255 characters')
  }
}

const validateDescription = (description?: string) => {
  if (description && description.length > 1000) {
    throw new ValidationError('Description must not exceed 1000 characters')
  }
}

const validateDueDate = (dueDate?: Date | null) => {
  if (dueDate && (!(dueDate instanceof Date) || isNaN(dueDate.getTime()))) {
    throw new ValidationError('Invalid due date format')
  }
}

// Error handling wrapper
async function withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (err) {
    // Ensure we have a proper Error object
    const error = err instanceof Error ? err : new Error(String(err))

    // Safe error logging that won't cause serialization issues
    console.error('Error occurred:', {
      type: error.constructor.name,
      message: error.message,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    })

    // Handle custom errors
    if (error instanceof ValidationError || 
        error instanceof AuthorizationError || 
        error instanceof PositionError) {
      throw error
    }

    // Handle Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Log Prisma-specific details safely
      console.error('Prisma error:', {
        code: error.code,
        message: error.message,
        meta: JSON.stringify(error.meta)
      })

      switch (error.code) {
        case 'P2002':
          throw new Error(`Unique constraint violation on ${error.meta?.target}`)
        case 'P2025':
          throw new Error(`Record not found: ${error.meta?.cause}`)
        case 'P2003':
          throw new Error(`Foreign key constraint failed on ${error.meta?.field_name}`)
        case 'P2014':
          throw new Error(`The change you are trying to make would violate the required relation '${error.meta?.relation_name}'`)
        default:
          throw new Error(`Database error (${error.code}): ${error.message}`)
      }
    }

    // Handle Prisma validation errors
    if (error instanceof Prisma.PrismaClientValidationError) {
      throw new Error(`Invalid data provided: ${error.message}`)
    }

    // Handle initialization errors
    if (error instanceof Prisma.PrismaClientInitializationError) {
      throw new Error(`Database connection failed: ${error.message}`)
    }

    // For unknown errors, throw a generic error message
    throw new Error('An unexpected error occurred')
  }
}

// Utility functions
async function getDefaultCategoryId(userId: string): Promise<string> {
  const defaultCategory = await prisma.category.findFirst({
    where: { userId, isDefault: true }
  })

  if (!defaultCategory) {
    const newDefaultCategory = await prisma.category.create({
      data: {
        name: 'Default',
        isDefault: true,
        userId,
        position: 0
      }
    })
    return newDefaultCategory.id
  }

  return defaultCategory.id
}

async function verifyTaskOwnership(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId }
  })
  if (!task) {
    throw new AuthorizationError('Task not found or unauthorized')
  }
  return task
}

async function verifyCategoryOwnership(userId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId }
  })
  if (!category) {
    throw new AuthorizationError('Category not found or unauthorized')
  }
  return category
}

// Create task for specific user
export async function createTask(userId: string, data: TaskFormData) {
  return withErrorHandling(async () => {
    // Validate input
    const validated = taskSchema.parse(data)
    
    // Rest of the function...
  })
}

// Get all tasks for specific user
export async function getTasks(userId: string) {
  return withErrorHandling(async () => {
    return await prisma.task.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: { category: true }
    })
  })
}

// Get single task (with user verification)
export async function getTask(userId: string, taskId: string) {
  return withErrorHandling(async () => {
    const task = await verifyTaskOwnership(userId, taskId)
    return task
  })
}

// Update task title
export async function updateTaskTitle(userId: string, taskId: string, title: string) {
  return withErrorHandling(async () => {
    validateTitle(title)
    await verifyTaskOwnership(userId, taskId)

    return await prisma.task.update({
      where: { id: taskId },
      data: { title }
    })
  })
}

// Update task description
export async function updateTaskDescription(userId: string, taskId: string, description: string) {
  return withErrorHandling(async () => {
    validateDescription(description)
    await verifyTaskOwnership(userId, taskId)

    return await prisma.task.update({
      where: { id: taskId },
      data: { description }
    })
  })
}

// Update task status
export async function updateTaskStatus(userId: string, taskId: string, status: TaskStatus) {
  return withErrorHandling(async () => {
    await verifyTaskOwnership(userId, taskId)

    return await prisma.task.update({
      where: { id: taskId },
      data: { status }
    })
  })
}

// Update task category
export async function updateTaskCategory(userId: string, taskId: string, categoryId: string) {
  return withErrorHandling(async () => {
    await verifyTaskOwnership(userId, taskId)
    await verifyCategoryOwnership(userId, categoryId)

    return await prisma.task.update({
      where: { id: taskId },
      data: { categoryId }
    })
  })
}

// Delete task
export async function deleteTask(userId: string, taskId: string) {
  return withErrorHandling(async () => {
    await verifyTaskOwnership(userId, taskId)

    return await prisma.task.delete({
      where: { id: taskId }
    })
  })
}

// Combined update function for multiple fields
export async function updateTask(
  userId: string,
  taskId: string,
  data: Partial<TaskFormData>
) {
  return withErrorHandling(async () => {
    // Validate partial input
    const validated = taskSchema.partial().parse(data)
    
    // Verify ownership
    await verifyTaskOwnership(userId, taskId)

    // Update task
    return await prisma.task.update({
      where: { id: taskId },
      data: {
        ...validated,
        updatedAt: new Date()
      }
    })
  })
}

// Add new move actions
export async function moveTask(
  userId: string,
  taskId: string,
  data: {
    beforeId?: string
    afterId?: string
    categoryId?: string
  }
) {
  return withErrorHandling(async () => {
    console.log('moveTask called with:', { userId, taskId, data });
    
    await verifyTaskOwnership(userId, taskId);
    
    return await prisma.$transaction(async (tx) => {
      const POSITION_GAP = 1000;
      
      const columnTasks = await tx.task.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
      });
      console.log('Found column tasks:', columnTasks);

      let newPosition: number;
      
      if (!data.beforeId && !data.afterId) {
        // Moving to start
        newPosition = columnTasks[0]?.position 
          ? columnTasks[0].position - POSITION_GAP 
          : 0;
      } else if (!data.beforeId) {
        // Moving before a task
        const afterTask = columnTasks.find(t => t.id === data.afterId);
        if (!afterTask) throw new Error('Reference task not found');
        newPosition = afterTask.position - (POSITION_GAP / 2);
      } else if (!data.afterId) {
        // Moving after a task
        const beforeTask = columnTasks.find(t => t.id === data.beforeId);
        if (!beforeTask) throw new Error('Reference task not found');
        newPosition = beforeTask.position + (POSITION_GAP / 2);
      } else {
        // Moving between two tasks
        const beforeTask = columnTasks.find(t => t.id === data.beforeId);
        const afterTask = columnTasks.find(t => t.id === data.afterId);
        if (!beforeTask || !afterTask) throw new Error('Reference task not found');
        
        const positionDiff = afterTask.position - beforeTask.position;
        if (positionDiff < 1) {
          // Rebalance if positions are too close
          await rebalancePositions(tx, columnTasks);
          // Recalculate position after rebalancing
          newPosition = (beforeTask.position + afterTask.position) / 2;
        } else {
          newPosition = beforeTask.position + (positionDiff / 2);
        }
      }

      console.log('Calculated new position:', newPosition);

      const result = await tx.task.update({
        where: { id: taskId },
        data: { position: newPosition }
      });
      console.log('Task updated with result:', result);
      return result;
    });
  });
}

// Helper function to rebalance positions
async function rebalancePositions(tx: any, tasks: Task[]) {
  const POSITION_GAP = 1000;
  
  return await Promise.all(
    tasks.map((task, index) => 
      tx.task.update({
        where: { id: task.id },
        data: { position: (index + 1) * POSITION_GAP }
      })
    )
  );
}

export async function moveCategory(
  userId: string,
  categoryId: string,
  data: {
    beforeId?: string
    afterId?: string
  }
) {
  return withErrorHandling(async () => {
    await verifyCategoryOwnership(userId, categoryId)

    return prisma.category.reorder({
      id: categoryId,
      beforeId: data.beforeId,
      afterId: data.afterId
    })
  })
}

// Create (as suggested before)
export async function createCategory(userId: string, data: {
  name: string
  isDefault?: boolean
}) {
  return withErrorHandling(async () => {
    // Add validation for userId
    if (!userId) {
      throw new ValidationError('User ID is required')
    }

    // Validate category name
    if (!data.name?.trim() || data.name.length > 255) {
      throw new ValidationError('Category name must be between 1 and 255 characters')
    }

    // First verify the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new AuthorizationError('User not found')
    }

    const lastCategory = await prisma.category.findFirst({
      where: { userId },
      orderBy: { position: 'desc' }
    })
    const position = (lastCategory?.position ?? 0) + 1000

    return await prisma.category.create({
      data: {
        name: data.name,
        isDefault: data.isDefault ?? false,
        position,
        userId
      }
    })
  })
}

// Read (missing)
export async function getCategories(userId: string) {
  return withErrorHandling(async () => {
    return await prisma.category.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: { tasks: true }
    })
  })
}

// Update (missing)
export async function updateCategory(userId: string, categoryId: string, data: {
  name?: string
  isDefault?: boolean
}) {
  return withErrorHandling(async () => {
    if (data.name && (!data.name?.trim() || data.name.length > 255)) {
      throw new ValidationError('Category name must be between 1 and 255 characters')
    }
    await verifyCategoryOwnership(userId, categoryId)

    return await prisma.category.update({
      where: { id: categoryId },
      data
    })
  })
}

// Delete (missing)
export async function deleteCategory(userId: string, categoryId: string) {
  return withErrorHandling(async () => {
    await verifyCategoryOwnership(userId, categoryId)
    
    // First move all tasks to default category
    const defaultCategoryId = await getDefaultCategoryId(userId)
    if (categoryId === defaultCategoryId) {
      throw new ValidationError('Cannot delete default category')
    }

    await prisma.task.updateMany({
      where: { categoryId },
      data: { categoryId: defaultCategoryId }
    })

    return await prisma.category.delete({
      where: { id: categoryId }
    })
  })
}