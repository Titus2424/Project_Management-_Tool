import { z } from 'zod';

/**
 * Zod schema for SystemUser validation
 */
export const SystemUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1, { message: "Full Name is required" }),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  roleKey: z.enum(['Admin', 'ProjectManager', 'Approver', 'Employee']),
  user: z.object({ id: z.string().uuid(), fullName: z.string() }),
});

/**
 * Schema for creating a new SystemUser (omits system-generated ID)
 */
export const CreateSystemUserSchema = SystemUserSchema.omit({ id: true });

/**
 * Schema for updating an existing SystemUser
 */
export const UpdateSystemUserSchema = SystemUserSchema;

export type SystemUserInput = z.infer<typeof SystemUserSchema>;
export type CreateSystemUserInput = z.infer<typeof CreateSystemUserSchema>;
export type UpdateSystemUserInput = z.infer<typeof UpdateSystemUserSchema>;