'use server'

/**
 * Server Actions for Task Management
 * 
 * Security:
 * - All actions verify user ownership
 * - Input validation via Zod schemas
 * - Error handling for all edge cases
 * 
 * Performance:
 * - Optimized queries with proper relations
 * - Transaction support for complex operations
 * - Position-based ordering system
 */

import { auth, currentUser } from '@clerk/nextjs/server'
import { TaskStatus, Task } from '@prisma/client'
import { prisma } from '@/lib/db'
import { ValidationError, AuthorizationError, PositionError } from '@/lib/errors'
import { TaskFormData, taskSchema } from '@/lib/schemas/task'
import { DeleteMode } from '@/lib/types'

interface CreateTaskInput {
  title: string;
  description?: string;
  categoryId?: string;
  dueDate?: Date | null;
  status?: TaskStatus;
}

// User management
/**
 * Gets or creates a user in the database
 * @param userId - The ID of the user from Clerk
 * @throws {AuthorizationError} If user is not authenticated
 * @returns The user object
 */
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
/**
 * Validates task title format
 * @param title - The title to validate
 * @throws {ValidationError} If title is invalid
 */
const validateTitle = (title: string) => {
  if (!title?.trim() || title.length > 255) {
    throw new ValidationError('Title must be between 1 and 255 characters')
  }
}

/**
 * Validates task description length
 * @param description - The description to validate
 * @throws {ValidationError} If description is too long
 */const validateDescription = (description?: string) => {
  if (description && description.length > 1000) {
    throw new ValidationError('Description must not exceed 1000 characters')
  }
}

/**
 * Validates task due date format
 * @param dueDate - The date to validate
 * @throws {ValidationError} If date format is invalid
 */
const validateDueDate = (dueDate?: Date | null) => {
  if (dueDate && (!(dueDate instanceof Date) || isNaN(dueDate.getTime()))) {
    throw new ValidationError('Invalid due date format')
  }
}

/**
 * Validates task status value
 * @param status - The status to validate
 * @throws {ValidationError} If status is invalid
 */
const validateStatus = (status: TaskStatus) => {
  const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED']
  if (!validStatuses.includes(status)) {
    throw new ValidationError('Invalid status')
  }
}

/**
 * Validates category ownership
 * @param userId - The ID of the user
 * @param categoryId - The ID of the category
 * @throws {ValidationError} If validation fails
 */
const validateCategoryId = async (userId: string, categoryId?: string) => {
  if (categoryId) {
    await verifyCategoryOwnership(userId, categoryId)
  }
}

// Utility functions
/**
 * Gets or creates the default category for a user
 * @param userId - The ID of the user
 * @returns The ID of the default category
 */
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

/**
 * Verifies a user owns a task and has permission to modify it
 * @param userId - The ID of the user
 * @param taskId - The ID of the task to verify
 * @throws {AuthorizationError} If the task doesn't exist or user lacks permission
 * @returns The verified task
 */
async function verifyTaskOwnership(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId }
  })
  if (!task) {
    throw new AuthorizationError('Task not found or unauthorized')
  }
  return task
}

/**
 * Verifies a user owns a category and has permission to modify it
 * @param userId - The ID of the user
 * @param categoryId - The ID of the category to verify
 * @throws {AuthorizationError} If the category doesn't exist or user lacks permission
 * @returns The verified category
 */
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
/**
 * Creates a new task for a user
 * @param userId - The ID of the user creating the task
 * @param data - The task data including title, description, status, etc.
 * @throws {ValidationError} If the task data is invalid
 * @throws {AuthorizationError} If the user is not authorized
 * @returns The created task
 */
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

/**
 * Retrieves all tasks for a specific user
 * @param userId - The ID of the user
 * @throws {Error} If there's an error fetching tasks
 * @returns Array of tasks with their categories
 */
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

/**
 * Gets a single task with ownership verification
 * @param userId - The ID of the user
 * @param taskId - The ID of the task
 * @throws {AuthorizationError} If user lacks permission
 * @returns The requested task
 */
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

/**
 * Updates a task's title
 * @param userId - The ID of the user
 * @param taskId - The ID of the task
 * @param title - The new title
 * @throws {ValidationError} If title is invalid
 * @throws {AuthorizationError} If user lacks permission
 * @returns The updated task
 */
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

/**
 * Updates a task's description
 * @param userId - The ID of the user
 * @param taskId - The ID of the task
 * @param description - The new description
 * @throws {ValidationError} If description is invalid
 * @throws {AuthorizationError} If user lacks permission
 * @returns The updated task
 */
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

/**
 * Updates task status
 * @param userId - The ID of the user
 * @param taskId - The ID of the task
 * @param newStatus - The new status to set
 * @throws {AuthorizationError} If user lacks permission
 * @returns The updated task
 */
export async function updateTaskStatus(userId: string, taskId: string, newStatus: TaskStatus) {
  try {
    await verifyTaskOwnership(userId, taskId)
    validateStatus(newStatus)
    
    return await prisma.task.update({
      where: { id: taskId },
      data: { status: newStatus }
    })
  } catch (error) {
    console.error('Error updating task status:', error)
    if (error instanceof ValidationError || error instanceof AuthorizationError) {
      throw error
    }
    throw new Error('Failed to update task status')
  }
}

/**
 * Updates a task's category
 * @param userId - The ID of the user
 * @param taskId - The ID of the task
 * @param categoryId - The ID of the new category
 * @throws {ValidationError} If category is invalid
 * @throws {AuthorizationError} If user lacks permission
 * @returns The updated task
 */
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

/**
 * Deletes a task
 * @param userId - The ID of the user
 * @param taskId - The ID of the task to delete
 * @throws {AuthorizationError} If user lacks permission
 * @returns The deleted task
 */
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

/**
 * Updates an existing task
 * @param userId - The ID of the user updating the task
 * @param taskId - The ID of the task to update
 * @param data - The updated task data
 * @throws {ValidationError} If the update data is invalid
 * @throws {AuthorizationError} If the user lacks permission
 * @returns The updated task
 */
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

/**
 * Moves a task to a new position
 * @param userId - The ID of the user
 * @param taskId - The ID of the task
 * @param data - Object containing beforeId and/or afterId for positioning
 * @throws {AuthorizationError} If user lacks permission
 * @throws {PositionError} If rebalancing fails
 */
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

/**
 * Rebalances position numbers for a list of tasks
 * @param tx - The prisma transaction client
 * @param tasks - Array of tasks to rebalance
 * @throws {PositionError} If rebalancing fails
 * @returns Array of updated tasks
 */
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

/**
 * Moves a category to a new position
 * @param userId - The ID of the user
 * @param categoryId - The ID of the category
 * @param data - Object containing beforeId and/or afterId for positioning
 * @throws {AuthorizationError} If user lacks permission
 * @throws {PositionError} If move fails
 * @returns The moved category
 */
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

/**
 * Creates a new category
 * @param userId - The ID of the user
 * @param data - Object containing name and optional isDefault flag
 * @throws {ValidationError} If data is invalid
 * @throws {AuthorizationError} If user not found
 * @returns The created category
 */
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

/**
 * Gets all categories for a user
 * @param userId - The ID of the user
 * @throws {ValidationError} If userId is invalid
 * @returns Array of categories with their tasks
 */
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

/**
 * Gets all tasks in a specific category
 * @param userId - The ID of the user
 * @param categoryId - The ID of the category
 * @throws {ValidationError} If IDs are invalid
 * @throws {AuthorizationError} If user lacks permission
 * @returns Array of tasks in the category
 */
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

/**
 * Gets the next available position number for a task
 * @param userId - The ID of the user
 * @throws {ValidationError} If userId is invalid
 * @returns The next position number
 */
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

/**
 * Deletes a category and handles its tasks
 * @param userId - The ID of the user
 * @param categoryId - The ID of the category to delete
 * @param mode - Whether to delete tasks or move them
 * @param targetCategoryId - Category to move tasks to if mode is 'move'
 * @throws {ValidationError} If category is default or data invalid
 * @throws {AuthorizationError} If user lacks permission
 */
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

/**
 * Updates default category names from 'Default' to 'unassigned'
 * @param userId - The ID of the user
 */
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
