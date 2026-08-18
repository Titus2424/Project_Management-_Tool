import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarService } from "../services/calendar-service";
import type { Calendar } from "../models/calendar-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all Calendar records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, name1
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useCalendarList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["calendar-list", options],
    queryFn: () => CalendarService.getAll(options),
  });
}

/**
 * Retrieve a single Calendar record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useCalendar(id: string) {
  return useQuery({
    queryKey: ["calendar", id],
    queryFn: () => CalendarService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new Calendar record.
 * @remarks Form validation: use CreateCalendarSchema with zodResolver for type-safe create forms
 */
export function useCreateCalendar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Calendar, "id">) => CalendarService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["calendar-list"] });
    },
  });
}

/**
 * Update an existing Calendar record.
 * @remarks Form validation: use UpdateCalendarSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateCalendar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<Calendar, "id">>;
    }) => CalendarService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["calendar-list"] });
      client.invalidateQueries({ queryKey: ["calendar", variables.id] });
    },
  });
}

/**
 * Delete a Calendar record by its unique identifier.
 */
export function useDeleteCalendar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => CalendarService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["calendar-list"] });
      client.invalidateQueries({ queryKey: ["calendar", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const Calendar_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { CalendarSchema, CreateCalendarSchema, UpdateCalendarSchema } from "../validators/calendar-validator";
export type { CalendarInput, CreateCalendarInput, UpdateCalendarInput } from "../validators/calendar-validator";