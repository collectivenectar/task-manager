'use server'

import { prisma } from '@/lib/db'

// Create task for specific user
export async function createTask(userId: string, data: {
  title: string
  description?: string
  status?: string
  category?: string
  position?: number
}) {
  const task = await prisma.task.create({
    data: {
      ...data,
      userId
    }
  })
  return task
}

// Get all tasks for specific user
export async function getTasks(userId: string) {
  const tasks = await prisma.task.findMany({
    where: {
      userId
    },
    orderBy: {
      position: 'asc'
    }
  })
  return tasks
}

// Get single task (with user verification)
export async function getTask(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId
    }
  })
  return task
}

// Update task title
export async function updateTaskTitle(userId: string, taskId: string, title: string) {
  const task = await prisma.task.updateMany({
    where: {
      id: taskId,
      userId
    },
    data: {
      title
    }
  })
  return task
}

// Update task description
export async function updateTaskDescription(userId: string, taskId: string, description: string) {
  const task = await prisma.task.updateMany({
    where: {
      id: taskId,
      userId
    },
    data: {
      description
    }
  })
  return task
}

// Update task status
export async function updateTaskStatus(userId: string, taskId: string, status: string) {
  const task = await prisma.task.updateMany({
    where: {
      id: taskId,
      userId
    },
    data: {
      status
    }
  })
  return task
}

// Update task category
export async function updateTaskCategory(userId: string, taskId: string, category: string) {
  const task = await prisma.task.updateMany({
    where: {
      id: taskId,
      userId
    },
    data: {
      category
    }
  })
  return task
}

// Update task position
export async function updateTaskPosition(userId: string, taskId: string, position: number) {
  const task = await prisma.task.updateMany({
    where: {
      id: taskId,
      userId
    },
    data: {
      position
    }
  })
  return task
}

// Delete task
export async function deleteTask(userId: string, taskId: string) {
  const task = await prisma.task.deleteMany({
    where: {
      id: taskId,
      userId
    }
  })
  return task
}

// Combined update function for multiple fields
export async function updateTask(
  userId: string,
  taskId: string,
  data: {
    title?: string
    description?: string
    status?: string
    category?: string
    position?: number
  }
) {
  const task = await prisma.task.updateMany({
    where: {
      id: taskId,
      userId
    },
    data
  })
  return task
}
