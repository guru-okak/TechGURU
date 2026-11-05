import { z } from 'zod'

export const persistenceCheckSchema = z.object({
  message: z.string().trim().min(1).max(200),
}).strict()
export const catalogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
})

