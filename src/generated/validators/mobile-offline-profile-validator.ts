import { z } from 'zod';

/**
 * Zod schema for MobileOfflineProfile validation
 */
export const MobileOfflineProfileSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
});

/**
 * Schema for creating a new MobileOfflineProfile (omits system-generated ID)
 */
export const CreateMobileOfflineProfileSchema = MobileOfflineProfileSchema.omit({ id: true });

/**
 * Schema for updating an existing MobileOfflineProfile
 */
export const UpdateMobileOfflineProfileSchema = MobileOfflineProfileSchema;

export type MobileOfflineProfileInput = z.infer<typeof MobileOfflineProfileSchema>;
export type CreateMobileOfflineProfileInput = z.infer<typeof CreateMobileOfflineProfileSchema>;
export type UpdateMobileOfflineProfileInput = z.infer<typeof UpdateMobileOfflineProfileSchema>;