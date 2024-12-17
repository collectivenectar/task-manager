import { z } from 'zod'

export const categorySchema = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(255, 'Category name must be less than 255 characters'),
  isDefault: z.boolean().optional()
})

export type CategoryFormData = z.infer<typeof categorySchema> 