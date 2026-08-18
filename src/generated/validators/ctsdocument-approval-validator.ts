import { z } from 'zod';

/**
 * Zod schema for CTSDocumentApproval validation
 */
export const CTSDocumentApprovalSchema = z.object({
  id: z.string().uuid(),
  approvalName: z.string().min(1, { message: "Approval Name is required" }),
  approver: z.object({ id: z.string().uuid(), fullName: z.string() }).optional(),
  comments: z.string().optional(),
  decisionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "DateTime must be in ISO format").optional(),
  decisionKey: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  document: z.object({ id: z.string().uuid(), documentName: z.string() }).optional(),
});

/**
 * Schema for creating a new CTSDocumentApproval (omits system-generated ID)
 */
export const CreateCTSDocumentApprovalSchema = CTSDocumentApprovalSchema.omit({ id: true });

/**
 * Schema for updating an existing CTSDocumentApproval
 */
export const UpdateCTSDocumentApprovalSchema = CTSDocumentApprovalSchema;

export type CTSDocumentApprovalInput = z.infer<typeof CTSDocumentApprovalSchema>;
export type CreateCTSDocumentApprovalInput = z.infer<typeof CreateCTSDocumentApprovalSchema>;
export type UpdateCTSDocumentApprovalInput = z.infer<typeof UpdateCTSDocumentApprovalSchema>;