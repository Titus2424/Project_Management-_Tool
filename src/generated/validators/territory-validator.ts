import { z } from 'zod';

/**
 * Zod schema for Territory validation
 */
export const TerritorySchema = z.object({
  id: z.string().uuid(),
  territoryName: z.string().min(1, { message: "Territory Name is required" }),
});

/**
 * Schema for creating a new Territory (omits system-generated ID)
 */
export const CreateTerritorySchema = TerritorySchema.omit({ id: true });

/**
 * Schema for updating an existing Territory
 */
export const UpdateTerritorySchema = TerritorySchema;

export type TerritoryInput = z.infer<typeof TerritorySchema>;
export type CreateTerritoryInput = z.infer<typeof CreateTerritorySchema>;
export type UpdateTerritoryInput = z.infer<typeof UpdateTerritorySchema>;