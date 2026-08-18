import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QueueService } from "../services/queue-service";
import type { Queue } from "../models/queue-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Queue records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useQueueList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["queue-list", options],
    queryFn: () => QueueService.getAll(options),
  });
}

/**
 * Retrieve a single Queue record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useQueue(id: string) {
  return useQuery({
    queryKey: ["queue", id],
    queryFn: () => QueueService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Queue record.
 * @remarks Form validation: use CreateQueueSchema with zodResolver for type-safe create forms
 */
export function useCreateQueue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Queue, "id">) => QueueService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["queue-list"] });
    },
  });
}

/**
 * Update an existing Queue record.
 * @remarks Form validation: use UpdateQueueSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateQueue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Queue, "id">>;
    }) => QueueService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["queue-list"] });
      client.invalidateQueries({ queryKey: ["queue", variables.id] });
    },
  });
}

/**
 * Delete a Queue record by its unique identifier.
 */
export function useDeleteQueue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => QueueService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["queue-list"] });
      client.invalidateQueries({ queryKey: ["queue", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Queue_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { QueueSchema, CreateQueueSchema, UpdateQueueSchema } from "../validators/queue-validator";
export type { QueueInput, CreateQueueInput, UpdateQueueInput } from "../validators/queue-validator";