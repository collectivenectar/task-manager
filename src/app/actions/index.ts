'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { Prisma, TaskStatus, Task } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ValidationError, AuthorizationError, PositionError } from '@/lib/errors'
import { categorySchema } from '@/lib/schemas/category'
import { TaskFormData, taskSchema } from '@/lib/schemas/task'

interface CreateTaskInput {
  title: string;
  description?: string;
  categoryId?: string;
  dueDate?: Date | null;
  status?: TaskStatus;
}

// User management
export async function getOrCreateDBUser() {
  try {
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
  } catch (error) {
    console.error('Error in getOrCreateDBUser:', error)
    if (error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to get or create user')
  }
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

// Add these validation helpers
const validateStatus = (status: TaskStatus) => {
  const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED']
  if (!validStatuses.includes(status)) {
    throw new ValidationError('Invalid status')
  }
}

const validateCategoryId = async (userId: string, categoryId?: string) => {
  if (categoryId) {
    await verifyCategoryOwnership(userId, categoryId)
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
        name: 'unassigned',
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
export async function createTask(userId: string, data: CreateTaskInput) {
  try {
    // Validation first
    validateTitle(data.title)
    validateDescription(data.description)
    validateDueDate(data.dueDate)

    const task = await prisma.task.create({
      data: {
        ...data,
        userId,
        position: await getNextPosition(userId),
        status: data.status || 'TODO',
        categoryId: data.categoryId || await getDefaultCategoryId(userId)
      }
    })
    return task
  } catch (error) {
    console.error('Error in createTask action:', error)
    // Don't wrap ValidationError in generic error
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    // Only wrap unexpected errors
    throw new Error('Failed to create task')
  }
}

// Get all tasks for specific user
export async function getTasks(userId: string) {
  try {
    return await prisma.task.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: { category: true }
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    throw new Error('Failed to fetch tasks')
  }
}

// Get single task (with user verification)
export async function getTask(userId: string, taskId: string) {
  try {
    const task = await verifyTaskOwnership(userId, taskId)
    return task
  } catch (error) {
    console.error('Error fetching task:', error)
    if (error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to fetch task')
  }
}

// Update task title
export async function updateTaskTitle(userId: string, taskId: string, title: string) {
  try {
    validateTitle(title)
    await verifyTaskOwnership(userId, taskId)

    return await prisma.task.update({
      where: { id: taskId },
      data: { title }
    })
  } catch (error) {
    console.error('Error updating task title:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to update task title')
  }
}

// Update task description
export async function updateTaskDescription(userId: string, taskId: string, description: string) {
  try {
    validateDescription(description)
    await verifyTaskOwnership(userId, taskId)

    return await prisma.task.update({
      where: { id: taskId },
      data: { description }
    })
  } catch (error) {
    console.error('Error updating task description:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to update task description')
  }
}

// Update task status
export async function updateTaskStatus(userId: string, taskId: string, status: TaskStatus) {
  try {
    await verifyTaskOwnership(userId, taskId)
    validateStatus(status)
    
    return await prisma.task.update({
      where: { id: taskId },
      data: { status }
    })
  } catch (error) {
    console.error('Error updating task status:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to update task status')
  }
}

// Update task category
export async function updateTaskCategory(userId: string, taskId: string, categoryId: string) {
  try {
    await verifyTaskOwnership(userId, taskId)
    await validateCategoryId(userId, categoryId)

    return await prisma.task.update({
      where: { id: taskId },
      data: { categoryId }
    })
  } catch (error) {
    console.error('Error updating task category:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to update task category')
  }
}

// Delete task
export async function deleteTask(userId: string, taskId: string) {
  try {
    await verifyTaskOwnership(userId, taskId)

    return await prisma.task.delete({
      where: { id: taskId }
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to delete task')
  }
}

// Combined update function for multiple fields
export async function updateTask(
  userId: string,
  taskId: string,
  data: Partial<TaskFormData>
) {
  try {
    // Validate partial input
    const validated = taskSchema.partial().parse(data)
    
    // Verify ownership
    await verifyTaskOwnership(userId, taskId)

    if (data.title) validateTitle(data.title)
    if (data.description) validateDescription(data.description)
    if (data.dueDate) validateDueDate(data.dueDate)
    if (data.status) validateStatus(data.status)
    if (data.categoryId) await validateCategoryId(userId, data.categoryId)

    return await prisma.task.update({
      where: { id: taskId },
      data: {
        ...validated,
        updatedAt: new Date()
      }
    })
  } catch (error) {
    console.error('Error updating task:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to update task')
  }
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
  try {
    await verifyTaskOwnership(userId, taskId)
    if (data.categoryId) {
      await validateCategoryId(userId, data.categoryId)
    }

    return await prisma.$transaction(async (tx) => {
      const POSITION_GAP = 1000
      
      const columnTasks = await tx.task.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
      })

      let newPosition: number
      
      if (!data.beforeId && !data.afterId) {
        // Moving to start
        newPosition = columnTasks[0]?.position 
          ? columnTasks[0].position - POSITION_GAP 
          : 0
      } else if (!data.beforeId) {
        // Moving before a task
        const afterTask = columnTasks.find(t => t.id === data.afterId)
        if (!afterTask) throw new PositionError('Reference task not found')
        newPosition = afterTask.position - (POSITION_GAP / 2)
      } else if (!data.afterId) {
        // Moving after a task
        const beforeTask = columnTasks.find(t => t.id === data.beforeId)
        if (!beforeTask) throw new PositionError('Reference task not found')
        newPosition = beforeTask.position + (POSITION_GAP / 2)
      } else {
        // Moving between two tasks
        const beforeTask = columnTasks.find(t => t.id === data.beforeId)
        const afterTask = columnTasks.find(t => t.id === data.afterId)
        if (!beforeTask || !afterTask) throw new PositionError('Reference task not found')
        
        const positionDiff = afterTask.position - beforeTask.position
        if (positionDiff < 1) {
          // Rebalance if positions are too close
          await rebalancePositions(tx, columnTasks)
          // Recalculate position after rebalancing
          newPosition = (beforeTask.position + afterTask.position) / 2
        } else {
          newPosition = beforeTask.position + (positionDiff / 2)
        }
      }

      return await tx.task.update({
        where: { id: taskId },
        data: { 
          position: newPosition,
          ...(data.categoryId && { categoryId: data.categoryId })
        }
      })
    })

  } catch (error) {
    console.error('Error moving task:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError || error instanceof PositionError) {
      throw error
    }
    throw new Error('Failed to move task')
  }
}

// Helper function to rebalance positions
async function rebalancePositions(tx: any, tasks: Task[]) {
  try {
    const POSITION_GAP = 1000
    
    return await Promise.all(
      tasks.map((task, index) => 
        tx.task.update({
          where: { id: task.id },
          data: { position: (index + 1) * POSITION_GAP }
        })
      )
    )
  } catch (error) {
    console.error('Error rebalancing positions:', error)
    throw new PositionError('Failed to rebalance positions')
  }
}

export async function moveCategory(
  userId: string,
  categoryId: string,
  data: {
    beforeId?: string
    afterId?: string
  }
) {
  try {
    await verifyCategoryOwnership(userId, categoryId)

    return await prisma.category.reorder({
      id: categoryId,
      beforeId: data.beforeId,
      afterId: data.afterId
    })
  } catch (error) {
    console.error('Error moving category:', error)
    if (error instanceof AuthorizationError || error instanceof PositionError) {
      throw error
    }
    throw new Error('Failed to move category')
  }
}

// Create category
export async function createCategory(userId: string, data: {
  name: string
  isDefault?: boolean
}) {
  try {
    // Validate userId
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
  } catch (error) {
    console.error('Error creating category:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to create category')
  }
}

// Get categories
export async function getCategories(userId: string) {
  try {
    // Update any existing default categories
    await updateDefaultCategoryName(userId)
    
    return await prisma.category.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
      include: { tasks: true }
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    if (error instanceof ValidationError) {
      throw error
    }
    throw new Error('Failed to fetch categories')
  }
}

// Get tasks by category
export async function getTasksByCategory(userId: string, categoryId: string) {
  try {
    if (!userId) {
      throw new ValidationError('User ID is required')
    }
    if (!categoryId) {
      throw new ValidationError('Category ID is required')
    }

    // Verify category ownership
    await verifyCategoryOwnership(userId, categoryId)

    return await prisma.task.findMany({
      where: {
        userId,
        categoryId
      },
      orderBy: { position: 'asc' }
    })
  } catch (error) {
    console.error('Error fetching tasks by category:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('An unexpected error occurred')
  }
}

async function getNextPosition(userId: string): Promise<number> {
  try {
    if (!userId) {
      throw new ValidationError('User ID is required')
    }

    const lastTask = await prisma.task.findFirst({
      where: { userId },
      orderBy: { position: 'desc' }
    })
    return (lastTask?.position ?? 0) + 1000
  } catch (error) {
    console.error('Error getting next position:', error)
    if (error instanceof ValidationError) {
      throw error
    }
    throw new Error('Failed to get next position')
  }
}

// Add a new type for delete mode
type DeleteMode = 'delete_all' | 'move'

export async function deleteCategory(
  userId: string, 
  categoryId: string, 
  mode: DeleteMode,
  targetCategoryId?: string
) {
  try {
    // Verify ownership and check if default
    const category = await verifyCategoryOwnership(userId, categoryId)
    if (category.isDefault) {
      throw new ValidationError('Cannot delete default category')
    }

    if (mode === 'move' && !targetCategoryId) {
      throw new ValidationError('Target category is required when moving tasks')
    }

    if (mode === 'delete_all') {
      // Delete all tasks and the category
      await prisma.task.deleteMany({
        where: { categoryId, userId }
      })
      await prisma.category.delete({
        where: { id: categoryId }
      })
    } else {
      // Verify target category ownership
      if (targetCategoryId) {
        await verifyCategoryOwnership(userId, targetCategoryId)
      }
      // Move tasks to target category then delete original
      await prisma.task.updateMany({
        where: { categoryId, userId },
        data: { categoryId: targetCategoryId }
      })
      await prisma.category.delete({
        where: { id: categoryId }
      })
    }
  } catch (error) {
    console.error('Error deleting category:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to delete category')
  }
}

// One-time update for existing default categories
export async function updateDefaultCategoryName(userId: string) {
  await prisma.category.updateMany({
    where: { 
      userId,
      isDefault: true,
      name: 'Default'  // Only update if it's still named "Default"
    },
    data: {
      name: 'unassigned'
    }
  })
}