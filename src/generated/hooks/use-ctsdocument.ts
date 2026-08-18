import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CTSDocumentService } from "../services/cts-document-service";
import type { CTSDocument } from "../models/cts-document-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all CTSDocument records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, documentName, comments, documentURL, fileSizeMB, sharePointFileID, statusKey, uploadedDate, versionNumber
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useCTSDocumentList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["cTSDocument-list", options],
    queryFn: () => CTSDocumentService.getAll(options),
  });
}

/**
 * Retrieve a single CTSDocument record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useCTSDocument(id: string) {
  return useQuery({
    queryKey: ["cTSDocument", id],
    queryFn: () => CTSDocumentService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new CTSDocument record.
 * @remarks Form validation: use CreateCTSDocumentSchema with zodResolver for type-safe create forms
 */
export function useCreateCTSDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<CTSDocument, "id">) => CTSDocumentService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["cTSDocument-list"] });
    },
  });
}

/**
 * Update an existing CTSDocument record.
 * @remarks Form validation: use UpdateCTSDocumentSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateCTSDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<CTSDocument, "id">>;
    }) => CTSDocumentService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["cTSDocument-list"] });
      client.invalidateQueries({ queryKey: ["cTSDocument", variables.id] });
    },
  });
}

/**
 * Delete a CTSDocument record by its unique identifier.
 */
export function useDeleteCTSDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CTSDocumentService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["cTSDocument-list"] });
      client.invalidateQueries({ queryKey: ["cTSDocument", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const CTSDocument_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { CTSDocumentSchema, CreateCTSDocumentSchema, UpdateCTSDocumentSchema } from "../validators/ctsdocument-validator";
export type { CTSDocumentInput, CreateCTSDocumentInput, UpdateCTSDocumentInput } from "../validators/ctsdocument-validator";