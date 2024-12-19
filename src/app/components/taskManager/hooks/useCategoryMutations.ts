import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createCategory } from '@/app/actions'

/**
 * Custom hook for managing category-related mutations
 * @param userId - The ID of the user performing the mutations
 * @returns Object containing mutation functions for category operations
 */
export function useCategoryMutations(userId: string) {
  const queryClient = useQueryClient()

  /**
   * Mutation for creating new categories
   * Validates and creates a category with the given name
   * Automatically invalidates category queries on success
   * @internal
   */
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