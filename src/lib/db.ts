import { PrismaClient } from '@prisma/client'
import { PositionError } from './errors'

const POSITION_SPACING = 1000 // Made magic number into a named constant

// Helper type for models that can be reordered
type Reorderable = {
  id: string
  position: number
}

// Generic reordering function
async function calculateNewPosition<T extends Reorderable>({
  before,
  after,
  findUnique
}: {
  before?: string
  after?: string
  findUnique: (id: string) => Promise<T | null>
}): Promise<number> {
  const [beforeItem, afterItem] = await Promise.all([
    before ? findUnique(before) : null,
    after ? findUnique(after) : null,
  ])

  // Handle potential floating point precision issues with a minimum gap
  const MIN_GAP = 0.001

  if (beforeItem && afterItem) {
    const newPosition = (afterItem.position + beforeItem.position) / 2
    // Check if we're getting too close
    if (Math.abs(newPosition - beforeItem.position) < MIN_GAP || 
        Math.abs(newPosition - afterItem.position) < MIN_GAP) {
      throw new PositionError('Positions too close, rebalancing required')
    }
    return newPosition
  }

  if (afterItem) {
    return afterItem.position / 2
  }

  if (beforeItem) {
    return beforeItem.position + POSITION_SPACING
  }

  return POSITION_SPACING
}

const prisma = new PrismaClient().$extends({
  model: {
    task: {
      async reorder(args: {
        id: string
        beforeId?: string
        afterId?: string
        categoryId?: string
      }) {
        const { id, beforeId, afterId, categoryId } = args
        
        const newPosition = await calculateNewPosition({
          before: beforeId,
          after: afterId,
          findUnique: (id) => prisma.task.findUnique({ where: { id } })
        })

        return prisma.task.update({
          where: { id },
          data: {
            position: newPosition,
            ...(categoryId && { categoryId })
          }
        })
      },
    },
    category: {
      async reorder(args: {
        id: string
        beforeId?: string
        afterId?: string
      }) {
        const { id, beforeId, afterId } = args
        
        const newPosition = await calculateNewPosition({
          before: beforeId,
          after: afterId,
          findUnique: (id) => prisma.category.findUnique({ where: { id } })
        })

        return prisma.category.update({
          where: { id },
          data: { position: newPosition }
        })
      }
    }
  }
})

export { prisma }

