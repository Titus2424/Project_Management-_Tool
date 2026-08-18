import { z } from 'zod';

/**
 * Zod schema for CTSProject validation
 */
export const CTSProjectSchema = z.object({
  id: z.string().uuid(),
  projectName: z.string().min(1, { message: "Project Name is required" }),
  description: z.string().optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  location: z.string().optional(),
  progress: z.number().int().optional(),
  projectCode: z.string().min(1, { message: "Project Code is required" }),
  projectManager: z.object({ id: z.string().uuid(), fullName: z.string() }).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  statusKey: z.enum(['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled']).optional(),
});

/**
 * Schema for creating a new CTSProject (omits system-generated ID)
 */
export const CreateCTSProjectSchema = CTSProjectSchema.omit({ id: true });

/**
 * Schema for updating an existing CTSProject
 */
export const UpdateCTSProjectSchema = CTSProjectSchema;

export type CTSProjectInput = z.infer<typeof CTSProjectSchema>;
export type CreateCTSProjectInput = z.infer<typeof CreateCTSProjectSchema>;
export type UpdateCTSProjectInput = z.infer<typeof UpdateCTSProjectSchema>;