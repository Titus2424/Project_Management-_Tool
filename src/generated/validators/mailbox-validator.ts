import { z } from 'zod';

/**
 * Zod schema for Mailbox validation
 */
export const MailboxSchema = z.object({
  id: z.string().uuid(),
  name1: z.string().min(1, { message: "Name is required" }),
});

/**
 * Schema for creating a new Mailbox (omits system-generated ID)
 */
export const CreateMailboxSchema = MailboxSchema.omit({ id: true });

/**
 * Schema for updating an existing Mailbox
 */
export const UpdateMailboxSchema = MailboxSchema;

export type MailboxInput = z.infer<typeof MailboxSchema>;
export type CreateMailboxInput = z.infer<typeof CreateMailboxSchema>;
export type UpdateMailboxInput = z.infer<typeof UpdateMailboxSchema>;