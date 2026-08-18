import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserService } from "../services/user-service";
import type { User } from "../models/user-model";
import type { IOperationOptions } from '../../../app-gen-sdk/data/common/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Retrieve all User records with optional filtering and sorting.
 * @param options Optional filtering and sorting options
 *   Available properties for sorting: id, id1, id2, fullName, accessModeKey, address1AddressTypeKey, address1County, address1Fax, address1Latitude, address1Longitude, address1Name, address1PostOfficeBox, address1ShippingMethodKey, address1UPSZone, address1UTCOffset, address2AddressTypeKey, address2County, address2Fax, address2Latitude, address2Longitude, address2Name, address2PostOfficeBox, address2ShippingMethodKey, address2Telephone1, address2Telephone2, address2Telephone3, address2UPSZone, address2UTCOffset, applicationID, applicationIDURI, azureADObjectID, azureDeletedOn, azureStateKey, city, countryRegion, defaultFiltersPopulated, defaultOneDriveForBusinessFolderName, deletedStateKey, deprecatedProcessStage, deprecatedTraversedPath, disabledReason, displayInServiceViews, email2, emailAddressO365AdminApprovalStatus, employee, entityImageId, exchangeRate, firstName, government, homePhone, incomingEmailDeliveryMethodKey, integrationUserMode, invitationStatusKey, jobTitle, lastName, licenseTypeKey, mainPhone, middleName, mobileAlertEmail, mobilePhone, nickname, organization, otherCity, otherCountryRegion, otherPhone, otherStateProvince, otherStreet1, otherStreet2, otherStreet3, otherZIPPostalCode, outgoingEmailDeliveryMethodKey, pager, passportHi, passportLo, photoURL, preferredAddressKey, preferredEmailKey, preferredPhoneKey, primaryEmail, primaryEmailStatusKey, process, restrictedAccessMode, salutation, sharePointEmailAddress, skills, stateProvince, status, street1, street2, street3, systemManagedUserTypeKey, title, toBypassIPFirewallRestrictionOnTheUser, uniqueUserIdentityId, userLicensed, userLicenseType, userName, userPUID, userSynced, windowsLiveID, yammerEmail, yammerUserID, zIPPostalCode
 *   Filtering supports OData syntax, e.g., "status eq 'active'"
 */
export function useUserList(options?: IOperationOptions) {
  return useQuery({
    queryKey: ["user-list", options],
    queryFn: () => UserService.getAll(options),
  });
}

/**
 * Retrieve a single User record by its unique identifier.
 * @param id The id of the record (must be a valid UUID)
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => UserService.get(id),
    enabled: !!id && UUID_REGEX.test(id),
  });
}

/**
 * Create a new User record.
 * @remarks Form validation: use CreateUserSchema with zodResolver for type-safe create forms
 */
export function useCreateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<User, "id">) => UserService.create(data),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["user-list"] });
    },
  });
}

/**
 * Update an existing User record.
 * @remarks Form validation: use UpdateUserSchema.partial().omit({ id: true }) with zodResolver for edit forms (matches changedFields input)
 */
export function useUpdateUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      changedFields,
    }: {
      id: string;
      changedFields: Partial<Omit<User, "id">>;
    }) => UserService.update(id, changedFields),
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["user-list"] });
      client.invalidateQueries({ queryKey: ["user", variables.id] });
    },
  });
}

/**
 * Delete a User record by its unique identifier.
 */
export function useDeleteUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => UserService.delete(id),
    onSuccess: (_data, id) => {
      client.invalidateQueries({ queryKey: ["user-list"] });
      client.invalidateQueries({ queryKey: ["user", id] });
    },
  });
}

/** Data source type for this table — drives InMemoryDataBanner visibility. */
export const User_DATA_SOURCE_TYPE = 'Dataverse' as const;

export { UserSchema, CreateUserSchema, UpdateUserSchema } from "../validators/user-validator";
export type { UserInput, CreateUserInput, UpdateUserInput } from "../validators/user-validator";