'use server'

import { Prisma, PrismaClient, TaskStatus } from '@prisma/client'
import { prisma } from '@/lib/db'

// Custom error classes
class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class PositionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PositionError'
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

// Error handling wrapper
async function withErrorHandling<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (
      error instanceof ValidationError || 
      error instanceof AuthorizationError ||
      error instanceof PositionError
    ) {
      throw error
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new Error('Unique constraint violation')
        case 'P2025':
          throw new Error('Record not found')
        default:
          console.error('Database error:', error)
          throw new Error('Database operation failed')
      }
    }
    console.error('Unexpected error:', error)
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
export async function createTask(userId: string, data: {
  title: string
  description?: string
  status?: TaskStatus
  categoryId?: string
}) {
  return withErrorHandling(async () => {
    validateTitle(data.title)
    validateDescription(data.description)

    if (data.categoryId) {
      await verifyCategoryOwnership(userId, data.categoryId)
    }

    const categoryId = data.categoryId ?? await getDefaultCategoryId(userId)
    
    // Get last task position
    const lastTask = await prisma.task.findFirst({
      where: { userId },
      orderBy: { position: 'desc' }
    })
    const position = (lastTask?.position ?? 0) + 1000

    return await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        status: data.status || TaskStatus.TODO,
        categoryId,
        position,
        userId
      }
    })
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
  data: {
    title?: string
    description?: string
    status?: TaskStatus
    categoryId?: string
  }
) {
  return withErrorHandling(async () => {
    if (data.title) validateTitle(data.title)
    if (data.description) validateDescription(data.description)
    if (data.categoryId) await verifyCategoryOwnership(userId, data.categoryId)

    await verifyTaskOwnership(userId, taskId)

    return await prisma.task.update({
      where: { id: taskId },
      data
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
    await verifyTaskOwnership(userId, taskId)
    if (data.categoryId) {
      await verifyCategoryOwnership(userId, data.categoryId)
    }

    return prisma.task.reorder({
      id: taskId,
      beforeId: data.beforeId,
      afterId: data.afterId,
      categoryId: data.categoryId
    })
  })
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