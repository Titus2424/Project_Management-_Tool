import { z } from 'zod';

/**
 * Zod schema for BusinessUnit validation
 */
export const BusinessUnitSchema = z.object({
  id: z.string().uuid(),
  id1: z.string().uuid(),
  id2: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
});

/**
 * Schema for creating a new BusinessUnit (omits system-generated ID)
 */
export const CreateBusinessUnitSchema = BusinessUnitSchema.omit({ id: true });

/**
 * Schema for updating an existing BusinessUnit
 */
export const UpdateBusinessUnitSchema = BusinessUnitSchema;

export type BusinessUnitInput = z.infer<typeof BusinessUnitSchema>;
export type CreateBusinessUnitInput = z.infer<typeof CreateBusinessUnitSchema>;
export type UpdateBusinessUnitInput = z.infer<typeof UpdateBusinessUnitSchema>;