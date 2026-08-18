import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BusinessUnitService } from "../services/business-unit-service";
import type { BusinessUnit } from "../models/business-unit-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all BusinessUnit records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, id1, id2, name1
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useBusinessUnitList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["businessUnit-list", options],
    queryFn: () => BusinessUnitService.getAll(options),
  });
}

/**
 * Retrieve a single BusinessUnit record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useBusinessUnit(id: string) {
  return useQuery({
    queryKey: ["businessUnit", id],
    queryFn: () => BusinessUnitService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new BusinessUnit record.
 * @remarks Form validation: use CreateBusinessUnitSchema with zodResolver for type-safe create forms
 */
export function useCreateBusinessUnit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<BusinessUnit, "id">) => BusinessUnitService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["businessUnit-list"] });
    },
  });
}

/**
 * Update an existing BusinessUnit record.
 * @remarks Form validation: use UpdateBusinessUnitSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateBusinessUnit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<BusinessUnit, "id">>;
    }) => BusinessUnitService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["businessUnit-list"] });
      client.invalidateQueries({ queryKey: ["businessUnit", variables.id] });
    },
  });
}

/**
 * Delete a BusinessUnit record by its unique identifier.
 */
export function useDeleteBusinessUnit() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => BusinessUnitService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["businessUnit-list"] });
      client.invalidateQueries({ queryKey: ["businessUnit", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const BusinessUnit_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { BusinessUnitSchema, CreateBusinessUnitSchema, UpdateBusinessUnitSchema } from "../validators/business-unit-validator";
export type { BusinessUnitInput, CreateBusinessUnitInput, UpdateBusinessUnitInput } from "../validators/business-unit-validator";