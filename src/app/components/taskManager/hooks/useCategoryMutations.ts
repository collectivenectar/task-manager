import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCategory } from '@/app/actions'
import { Category } from '@prisma/client'

export function useCategoryMutations(userId: string) {
  const queryClient = useQueryClient()

  const createCategoryMutation = useMutation({
    mutationFn: (data: { name: string }) => createCategory(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    }
  })

  return {
    createCategoryMutation
  }
} 