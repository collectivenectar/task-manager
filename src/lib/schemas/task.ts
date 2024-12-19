import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .nullable()
    .optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED'] as const),
  dueDate: z.date()
    .nullable()
    .optional(),
  categoryId: z.string()
    .min(1, 'Category is required')
})

export type TaskFormData = z.infer<typeof taskSchema> 