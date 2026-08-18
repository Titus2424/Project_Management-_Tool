import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MailboxService } from "../services/mailbox-service";
import type { Mailbox } from "../models/mailbox-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Mailbox records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useMailboxList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["mailbox-list", options],
    queryFn: () => MailboxService.getAll(options),
  });
}

/**
 * Retrieve a single Mailbox record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useMailbox(id: string) {
  return useQuery({
    queryKey: ["mailbox", id],
    queryFn: () => MailboxService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Mailbox record.
 * @remarks Form validation: use CreateMailboxSchema with zodResolver for type-safe create forms
 */
export function useCreateMailbox() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Mailbox, "id">) => MailboxService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["mailbox-list"] });
    },
  });
}

/**
 * Update an existing Mailbox record.
 * @remarks Form validation: use UpdateMailboxSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateMailbox() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Mailbox, "id">>;
    }) => MailboxService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["mailbox-list"] });
      client.invalidateQueries({ queryKey: ["mailbox", variables.id] });
    },
  });
}

/**
 * Delete a Mailbox record by its unique identifier.
 */
export function useDeleteMailbox() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => MailboxService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["mailbox-list"] });
      client.invalidateQueries({ queryKey: ["mailbox", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Mailbox_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { MailboxSchema, CreateMailboxSchema, UpdateMailboxSchema } from "../validators/mailbox-validator";
export type { MailboxInput, CreateMailboxInput, UpdateMailboxInput } from "../validators/mailbox-validator";