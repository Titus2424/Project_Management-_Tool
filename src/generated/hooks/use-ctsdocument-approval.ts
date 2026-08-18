import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CTSDocumentApprovalService } from "../services/cts-document-approval-service";
import type { CTSDocumentApproval } from "../models/cts-document-approval-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all CTSDocumentApproval records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, approvalName, comments, decisionDate, decisionKey
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useCTSDocumentApprovalList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["cTSDocumentApproval-list", options],
    queryFn: () => CTSDocumentApprovalService.getAll(options),
  });
}

/**
 * Retrieve a single CTSDocumentApproval record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useCTSDocumentApproval(id: string) {
  return useQuery({
    queryKey: ["cTSDocumentApproval", id],
    queryFn: () => CTSDocumentApprovalService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new CTSDocumentApproval record.
 * @remarks Form validation: use CreateCTSDocumentApprovalSchema with zodResolver for type-safe create forms
 */
export function useCreateCTSDocumentApproval() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CTSDocumentApproval, "id">) => CTSDocumentApprovalService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["cTSDocumentApproval-list"] });
    },
  });
}

/**
 * Update an existing CTSDocumentApproval record.
 * @remarks Form validation: use UpdateCTSDocumentApprovalSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateCTSDocumentApproval() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<CTSDocumentApproval, "id">>;
    }) => CTSDocumentApprovalService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["cTSDocumentApproval-list"] });
      client.invalidateQueries({ queryKey: ["cTSDocumentApproval", variables.id] });
    },
  });
}

/**
 * Delete a CTSDocumentApproval record by its unique identifier.
 */
export function useDeleteCTSDocumentApproval() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CTSDocumentApprovalService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["cTSDocumentApproval-list"] });
      client.invalidateQueries({ queryKey: ["cTSDocumentApproval", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const CTSDocumentApproval_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { CTSDocumentApprovalSchema, CreateCTSDocumentApprovalSchema, UpdateCTSDocumentApprovalSchema } from "../validators/ctsdocument-approval-validator";
export type { CTSDocumentApprovalInput, CreateCTSDocumentApprovalInput, UpdateCTSDocumentApprovalInput } from "../validators/ctsdocument-approval-validator";