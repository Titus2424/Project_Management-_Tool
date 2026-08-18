import { z } from 'zod';

/**
 * Zod schema for CTSDocument validation
 */
export const CTSDocumentSchema = z.object({
  id: z.string().uuid(),
  documentName: z.string().min(1, { message: "Document Name is required" }),
  comments: z.string().optional(),
  documentURL: z.string().url().optional(),
  fileSizeMB: z.number().optional(),
  project: z.object({ id: z.string().uuid(), projectName: z.string() }).optional(),
  sharePointFileID: z.string().min(1, { message: "SharePoint File ID is required" }),
  statusKey: z.enum(['Draft', 'Submitted', 'Approved', 'Rejected', 'RevisionRequired']).optional(),
  task: z.object({ id: z.string().uuid(), taskName: z.string() }).optional(),
  uploadedBy: z.object({ id: z.string().uuid(), fullName: z.string() }).optional(),
  uploadedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  versionNumber: z.string().optional(),
});

/**
 * Schema for creating a new CTSDocument (omits system-generated ID)
 */
export const CreateCTSDocumentSchema = CTSDocumentSchema.omit({ id: true });

/**
 * Schema for updating an existing CTSDocument
 */
export const UpdateCTSDocumentSchema = CTSDocumentSchema;

export type CTSDocumentInput = z.infer<typeof CTSDocumentSchema>;
export type CreateCTSDocumentInput = z.infer<typeof CreateCTSDocumentSchema>;
export type UpdateCTSDocumentInput = z.infer<typeof UpdateCTSDocumentSchema>;