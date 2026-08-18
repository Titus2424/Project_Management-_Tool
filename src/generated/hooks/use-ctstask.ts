import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CTSTaskService } from "../services/cts-task-service";
import type { CTSTask } from "../models/cts-task-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all CTSTask records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, taskName, dueDate, priorityKey, statusKey, taskDescription
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useCTSTaskList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["cTSTask-list", options],
    queryFn: () => CTSTaskService.getAll(options),
  });
}

/**
 * Retrieve a single CTSTask record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useCTSTask(id: string) {
  return useQuery({
    queryKey: ["cTSTask", id],
    queryFn: () => CTSTaskService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new CTSTask record.
 * @remarks Form validation: use CreateCTSTaskSchema with zodResolver for type-safe create forms
 */
export function useCreateCTSTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CTSTask, "id">) => CTSTaskService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["cTSTask-list"] });
    },
  });
}

/**
 * Update an existing CTSTask record.
 * @remarks Form validation: use UpdateCTSTaskSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateCTSTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<CTSTask, "id">>;
    }) => CTSTaskService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["cTSTask-list"] });
      client.invalidateQueries({ queryKey: ["cTSTask", variables.id] });
    },
  });
}

/**
 * Delete a CTSTask record by its unique identifier.
 */
export function useDeleteCTSTask() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CTSTaskService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["cTSTask-list"] });
      client.invalidateQueries({ queryKey: ["cTSTask", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const CTSTask_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { CTSTaskSchema, CreateCTSTaskSchema, UpdateCTSTaskSchema } from "../validators/ctstask-validator";
export type { CTSTaskInput, CreateCTSTaskInput, UpdateCTSTaskInput } from "../validators/ctstask-validator";