import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TerritoryService } from "../services/territory-service";
import type { Territory } from "../models/territory-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Territory records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, territoryName
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useTerritoryList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["territory-list", options],
    queryFn: () => TerritoryService.getAll(options),
  });
}

/**
 * Retrieve a single Territory record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useTerritory(id: string) {
  return useQuery({
    queryKey: ["territory", id],
    queryFn: () => TerritoryService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Territory record.
 * @remarks Form validation: use CreateTerritorySchema with zodResolver for type-safe create forms
 */
export function useCreateTerritory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Territory, "id">) => TerritoryService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["territory-list"] });
    },
  });
}

/**
 * Update an existing Territory record.
 * @remarks Form validation: use UpdateTerritorySchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateTerritory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Territory, "id">>;
    }) => TerritoryService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["territory-list"] });
      client.invalidateQueries({ queryKey: ["territory", variables.id] });
    },
  });
}

/**
 * Delete a Territory record by its unique identifier.
 */
export function useDeleteTerritory() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => TerritoryService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["territory-list"] });
      client.invalidateQueries({ queryKey: ["territory", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Territory_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { TerritorySchema, CreateTerritorySchema, UpdateTerritorySchema } from "../validators/territory-validator";
export type { TerritoryInput, CreateTerritoryInput, UpdateTerritoryInput } from "../validators/territory-validator";