import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MobileOfflineProfileService } from "../services/mobile-offline-profile-service";
import type { MobileOfflineProfile } from "../models/mobile-offline-profile-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all MobileOfflineProfile records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useMobileOfflineProfileList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["mobileOfflineProfile-list", options],
    queryFn: () => MobileOfflineProfileService.getAll(options),
  });
}

/**
 * Retrieve a single MobileOfflineProfile record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useMobileOfflineProfile(id: string) {
  return useQuery({
    queryKey: ["mobileOfflineProfile", id],
    queryFn: () => MobileOfflineProfileService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new MobileOfflineProfile record.
 * @remarks Form validation: use CreateMobileOfflineProfileSchema with zodResolver for type-safe create forms
 */
export function useCreateMobileOfflineProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<MobileOfflineProfile, "id">) => MobileOfflineProfileService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["mobileOfflineProfile-list"] });
    },
  });
}

/**
 * Update an existing MobileOfflineProfile record.
 * @remarks Form validation: use UpdateMobileOfflineProfileSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateMobileOfflineProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<MobileOfflineProfile, "id">>;
    }) => MobileOfflineProfileService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["mobileOfflineProfile-list"] });
      client.invalidateQueries({ queryKey: ["mobileOfflineProfile", variables.id] });
    },
  });
}

/**
 * Delete a MobileOfflineProfile record by its unique identifier.
 */
export function useDeleteMobileOfflineProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => MobileOfflineProfileService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["mobileOfflineProfile-list"] });
      client.invalidateQueries({ queryKey: ["mobileOfflineProfile", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const MobileOfflineProfile_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { MobileOfflineProfileSchema, CreateMobileOfflineProfileSchema, UpdateMobileOfflineProfileSchema } from "../validators/mobile-offline-profile-validator";
export type { MobileOfflineProfileInput, CreateMobileOfflineProfileInput, UpdateMobileOfflineProfileInput } from "../validators/mobile-offline-profile-validator";