import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemUserService } from "../services/system-user-service";
import type { SystemUser } from "../models/system-user-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all SystemUser records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, fullName, email, isActive, roleKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useSystemUserList(
  options?: IOperationOptions,
  queryOptions?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ["systemUser-list", options],
    queryFn: () => SystemUserService.getAll(options),
    enabled: queryOptions?.enabled,
  });
}

/**
 * Retrieve a single SystemUser record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useSystemUser(id: string) {
  return useQuery({
    queryKey: ["systemUser", id],
    queryFn: () => SystemUserService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new SystemUser record.
 * @remarks Form validation: use CreateSystemUserSchema with zodResolver for type-safe create forms
 */
export function useCreateSystemUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SystemUser, "id">) => SystemUserService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["systemUser-list"] });
    },
  });
}

/**
 * Update an existing SystemUser record.
 * @remarks Form validation: use UpdateSystemUserSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateSystemUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<SystemUser, "id">>;
    }) => SystemUserService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["systemUser-list"] });
      client.invalidateQueries({ queryKey: ["systemUser", variables.id] });
    },
  });
}

/**
 * Delete a SystemUser record by its unique identifier.
 */
export function useDeleteSystemUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => SystemUserService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["systemUser-list"] });
      client.invalidateQueries({ queryKey: ["systemUser", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const SystemUser_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { SystemUserSchema, CreateSystemUserSchema, UpdateSystemUserSchema } from "../validators/system-user-validator";
export type { SystemUserInput, CreateSystemUserInput, UpdateSystemUserInput } from "../validators/system-user-validator";