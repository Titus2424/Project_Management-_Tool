import { z } from 'zod';

/**
 * Zod schema for Currency validation
 */
export const CurrencySchema = z.object({
  id: z.string().uuid(),
  currencyName: z.string().min(1, { message: "Currency Name is required" }),
});

/**
 * Schema for creating a new Currency (omits system-generated ID)
 */
export const CreateCurrencySchema = CurrencySchema.omit({ id: true });

/**
 * Schema for updating an existing Currency
 */
export const UpdateCurrencySchema = CurrencySchema;

export type CurrencyInput = z.infer<typeof CurrencySchema>;
export type CreateCurrencyInput = z.infer<typeof CreateCurrencySchema>;
export type UpdateCurrencyInput = z.infer<typeof UpdateCurrencySchema>;