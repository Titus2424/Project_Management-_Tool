import { z } from 'zod';

/**
 * Zod schema for CTSTask validation
 */
export const CTSTaskSchema = z.object({
  id: z.string().uuid(),
  taskName: z.string().min(1, { message: "Task Name is required" }),
  assignedTo: z.object({ id: z.string().uuid(), fullName: z.string() }).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").optional(),
  priorityKey: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  project: z.object({ id: z.string().uuid(), projectName: z.string() }).optional(),
  statusKey: z.enum(['NotStarted', 'InProgress', 'Submitted', 'Approved', 'Completed']).optional(),
  taskDescription: z.string().optional(),
});

/**
 * Schema for creating a new CTSTask (omits system-generated ID)
 */
export const CreateCTSTaskSchema = CTSTaskSchema.omit({ id: true });

/**
 * Schema for updating an existing CTSTask
 */
export const UpdateCTSTaskSchema = CTSTaskSchema;

export type CTSTaskInput = z.infer<typeof CTSTaskSchema>;
export type CreateCTSTaskInput = z.infer<typeof CreateCTSTaskSchema>;
export type UpdateCTSTaskInput = z.infer<typeof UpdateCTSTaskSchema>;