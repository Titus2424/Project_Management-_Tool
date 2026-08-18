import { z } from 'zod';

/**
 * Zod schema for Position validation
 */
export const PositionSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
});

/**
 * Schema for creating a new Position (omits system-generated ID)
 */
export const CreatePositionSchema = PositionSchema.omit({ id: true });

/**
 * Schema for updating an existing Position
 */
export const UpdatePositionSchema = PositionSchema;

export type PositionInput = z.infer<typeof PositionSchema>;
export type CreatePositionInput = z.infer<typeof CreatePositionSchema>;
export type UpdatePositionInput = z.infer<typeof UpdatePositionSchema>;