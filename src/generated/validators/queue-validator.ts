import { z } from 'zod';

/**
 * Zod schema for Queue validation
 */
export const QueueSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
});

/**
 * Schema for creating a new Queue (omits system-generated ID)
 */
export const CreateQueueSchema = QueueSchema.omit({ id: true });

/**
 * Schema for updating an existing Queue
 */
export const UpdateQueueSchema = QueueSchema;

export type QueueInput = z.infer<typeof QueueSchema>;
export type CreateQueueInput = z.infer<typeof CreateQueueSchema>;
export type UpdateQueueInput = z.infer<typeof UpdateQueueSchema>;