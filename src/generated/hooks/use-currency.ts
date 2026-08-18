import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CurrencyService } from "../services/currency-service";
import type { Currency } from "../models/currency-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Currency records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, currencyName
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useCurrencyList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["currency-list", options],
    queryFn: () => CurrencyService.getAll(options),
  });
}

/**
 * Retrieve a single Currency record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useCurrency(id: string) {
  return useQuery({
    queryKey: ["currency", id],
    queryFn: () => CurrencyService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Currency record.
 * @remarks Form validation: use CreateCurrencySchema with zodResolver for type-safe create forms
 */
export function useCreateCurrency() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Currency, "id">) => CurrencyService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["currency-list"] });
    },
  });
}

/**
 * Update an existing Currency record.
 * @remarks Form validation: use UpdateCurrencySchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateCurrency() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Currency, "id">>;
    }) => CurrencyService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["currency-list"] });
      client.invalidateQueries({ queryKey: ["currency", variables.id] });
    },
  });
}

/**
 * Delete a Currency record by its unique identifier.
 */
export function useDeleteCurrency() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CurrencyService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["currency-list"] });
      client.invalidateQueries({ queryKey: ["currency", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Currency_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { CurrencySchema, CreateCurrencySchema, UpdateCurrencySchema } from "../validators/currency-validator";
export type { CurrencyInput, CreateCurrencyInput, UpdateCurrencyInput } from "../validators/currency-validator";