import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PositionService } from "../services/position-service";
import type { Position } from "../models/position-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Position records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function usePositionList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["position-list", options],
    queryFn: () => PositionService.getAll(options),
  });
}

/**
 * Retrieve a single Position record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function usePosition(id: string) {
  return useQuery({
    queryKey: ["position", id],
    queryFn: () => PositionService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Position record.
 * @remarks Form validation: use CreatePositionSchema with zodResolver for type-safe create forms
 */
export function useCreatePosition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Position, "id">) => PositionService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["position-list"] });
    },
  });
}

/**
 * Update an existing Position record.
 * @remarks Form validation: use UpdatePositionSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdatePosition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Position, "id">>;
    }) => PositionService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["position-list"] });
      client.invalidateQueries({ queryKey: ["position", variables.id] });
    },
  });
}

/**
 * Delete a Position record by its unique identifier.
 */
export function useDeletePosition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => PositionService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["position-list"] });
      client.invalidateQueries({ queryKey: ["position", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Position_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { PositionSchema, CreatePositionSchema, UpdatePositionSchema } from "../validators/position-validator";
export type { PositionInput, CreatePositionInput, UpdatePositionInput } from "../validators/position-validator";