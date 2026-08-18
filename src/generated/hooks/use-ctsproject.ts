import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CTSProjectService } from "../services/cts-project-service";
import type { CTSProject } from "../models/cts-project-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all CTSProject records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, projectName, description, endDate, location, progress, projectCode, startDate, statusKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useCTSProjectList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["cTSProject-list", options],
    queryFn: () => CTSProjectService.getAll(options),
  });
}

/**
 * Retrieve a single CTSProject record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useCTSProject(id: string) {
  return useQuery({
    queryKey: ["cTSProject", id],
    queryFn: () => CTSProjectService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new CTSProject record.
 * @remarks Form validation: use CreateCTSProjectSchema with zodResolver for type-safe create forms
 */
export function useCreateCTSProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CTSProject, "id">) => CTSProjectService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["cTSProject-list"] });
    },
  });
}

/**
 * Update an existing CTSProject record.
 * @remarks Form validation: use UpdateCTSProjectSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateCTSProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<CTSProject, "id">>;
    }) => CTSProjectService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["cTSProject-list"] });
      client.invalidateQueries({ queryKey: ["cTSProject", variables.id] });
    },
  });
}

/**
 * Delete a CTSProject record by its unique identifier.
 */
export function useDeleteCTSProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CTSProjectService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["cTSProject-list"] });
      client.invalidateQueries({ queryKey: ["cTSProject", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const CTSProject_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { CTSProjectSchema, CreateCTSProjectSchema, UpdateCTSProjectSchema } from "../validators/ctsproject-validator";
export type { CTSProjectInput, CreateCTSProjectInput, UpdateCTSProjectInput } from "../validators/ctsproject-validator";