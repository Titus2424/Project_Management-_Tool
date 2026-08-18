import { z } from 'zod';

/**
 * Zod schema for Calendar validation
 */
export const CalendarSchema = z.object({
  id: z.string().uuid(),
  name1: z.string(),
});

/**
 * Schema for creating a new Calendar (omits system-generated ID)
 */
export const CreateCalendarSchema = CalendarSchema.omit({ id: true });

/**
 * Schema for updating an existing Calendar
 */
export const UpdateCalendarSchema = CalendarSchema;

export type CalendarInput = z.infer<typeof CalendarSchema>;
export type CreateCalendarInput = z.infer<typeof CreateCalendarSchema>;
export type UpdateCalendarInput = z.infer<typeof UpdateCalendarSchema>;