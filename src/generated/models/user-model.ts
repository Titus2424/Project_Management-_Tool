import type { BusinessUnit } from './business-unit-model';
import type { Calendar } from './calendar-model';
import type { Company } from './company-model';
import type { Currency } from './currency-model';
import type { Queue } from './queue-model';
import type { Mailbox } from './mailbox-model';
import type { MobileOfflineProfile } from './mobile-offline-profile-model';
import type { Position } from './position-model';
import type { Territory } from './territory-model';

export const UserAccessModeKeyToLabel = {
  'ReadWrite': 'Read-Write',
  'Administrative': 'Administrative',
  'Read': 'Read',
  'SupportUser': 'Support User',
  'NonInteractive': 'Non-interactive',
  'DelegatedAdmin': 'Delegated Admin'
} as const;
export type UserAccessModeKey = keyof typeof UserAccessModeKeyToLabel;

export const UserAddress1AddressTypeKeyToLabel = {
  'DefaultValue': 'Default Value'
} as const;
export type UserAddress1AddressTypeKey = keyof typeof UserAddress1AddressTypeKeyToLabel;

export const UserAddress1ShippingMethodKeyToLabel = {
  'DefaultValue': 'Default Value'
} as const;
export type UserAddress1ShippingMethodKey = keyof typeof UserAddress1ShippingMethodKeyToLabel;

export const UserAddress2AddressTypeKeyToLabel = {
  'DefaultValue': 'Default Value'
} as const;
export type UserAddress2AddressTypeKey = keyof typeof UserAddress2AddressTypeKeyToLabel;

export const UserAddress2ShippingMethodKeyToLabel = {
  'DefaultValue': 'Default Value'
} as const;
export type UserAddress2ShippingMethodKey = keyof typeof UserAddress2ShippingMethodKeyToLabel;

export const UserAzureStateKeyToLabel = {
  'Exists': 'Exists',
  'SoftDeleted': 'Soft deleted',
  'NotFoundOrHardDeleted': 'Not found or hard deleted'
} as const;
export type UserAzureStateKey = keyof typeof UserAzureStateKeyToLabel;

export const UserDeletedStateKeyToLabel = {
  'NotDeleted': 'Not deleted',
  'SoftDeleted': 'Soft deleted'
} as const;
export type UserDeletedStateKey = keyof typeof UserDeletedStateKeyToLabel;

export const UserIncomingEmailDeliveryMethodKeyToLabel = {
  'None': 'None',
  'MicrosoftDynamics365ForOutlook': 'Microsoft Dynamics 365 for Outlook',
  'ServerSideSynchronizationOrEmailRouter': 'Server-Side Synchronization or Email Router',
  'ForwardMailbox': 'Forward Mailbox'
} as const;
export type UserIncomingEmailDeliveryMethodKey = keyof typeof UserIncomingEmailDeliveryMethodKeyToLabel;

export const UserInvitationStatusKeyToLabel = {
  'InvitationNotSent': 'Invitation Not Sent',
  'Invited': 'Invited',
  'InvitationNearExpired': 'Invitation Near Expired',
  'InvitationExpired': 'Invitation Expired',
  'InvitationAccepted': 'Invitation Accepted',
  'InvitationRejected': 'Invitation Rejected',
  'InvitationRevoked': 'Invitation Revoked'
} as const;
export type UserInvitationStatusKey = keyof typeof UserInvitationStatusKeyToLabel;

export const UserLicenseTypeKeyToLabel = {
  'Professional': 'Professional',
  'Administrative': 'Administrative',
  'Basic': 'Basic',
  'DeviceProfessional': 'Device Professional',
  'DeviceBasic': 'Device Basic',
  'Essential': 'Essential',
  'DeviceEssential': 'Device Essential',
  'Enterprise': 'Enterprise',
  'DeviceEnterprise': 'Device Enterprise',
  'Sales': 'Sales',
  'Service': 'Service',
  'FieldService': 'Field Service',
  'ProjectService': 'Project Service'
} as const;
export type UserLicenseTypeKey = keyof typeof UserLicenseTypeKeyToLabel;

export const UserOutgoingEmailDeliveryMethodKeyToLabel = {
  'None': 'None',
  'MicrosoftDynamics365ForOutlook': 'Microsoft Dynamics 365 for Outlook',
  'ServerSideSynchronizationOrEmailRouter': 'Server-Side Synchronization or Email Router'
} as const;
export type UserOutgoingEmailDeliveryMethodKey = keyof typeof UserOutgoingEmailDeliveryMethodKeyToLabel;

export const UserPreferredAddressKeyToLabel = {
  'MailingAddress': 'Mailing Address',
  'OtherAddress': 'Other Address'
} as const;
export type UserPreferredAddressKey = keyof typeof UserPreferredAddressKeyToLabel;

export const UserPreferredEmailKeyToLabel = {
  'DefaultValue': 'Default Value'
} as const;
export type UserPreferredEmailKey = keyof typeof UserPreferredEmailKeyToLabel;

export const UserPreferredPhoneKeyToLabel = {
  'MainPhone': 'Main Phone',
  'OtherPhone': 'Other Phone',
  'HomePhone': 'Home Phone',
  'MobilePhone': 'Mobile Phone'
} as const;
export type UserPreferredPhoneKey = keyof typeof UserPreferredPhoneKeyToLabel;

export const UserPrimaryEmailStatusKeyToLabel = {
  'Empty': 'Empty',
  'Approved': 'Approved',
  'PendingApproval': 'Pending Approval',
  'Rejected': 'Rejected'
} as const;
export type UserPrimaryEmailStatusKey = keyof typeof UserPrimaryEmailStatusKeyToLabel;

export const UserSystemManagedUserTypeKeyToLabel = {
  'EntraUser': 'Entra User',
  'C2User': 'C2 User',
  'ImpersonableStubUser': 'Impersonable Stub User',
  'AgenticUser': 'Agentic User',
  'NonLicensed': 'NonLicensed'
} as const;
export type UserSystemManagedUserTypeKey = keyof typeof UserSystemManagedUserTypeKeyToLabel;

export interface User {
  /**
   * @displayName User
   * @description Unique system identifier - GUID generated by system
   * @uiConstraints NEVER create input fields for this ID
   */
  id: string;
  /**
   * @displayName Address 1: ID
   * @description Unique system identifier - GUID generated by system
   * @uiConstraints NEVER create input fields for this ID
   */
  id1: string;
  /**
   * @displayName Address 2: ID
   * @description Unique system identifier - GUID generated by system
   * @uiConstraints NEVER create input fields for this ID
   */
  id2: string;
  /**
   * @displayName Full Name
   * @description Human-readable record identifier
   */
  fullName: string;
  /**
   * @displayName Access Mode
   * @validationRule Required for create/update operations
   */
  accessModeKey: UserAccessModeKey;
  /**
   * @displayName Address 1: Address Type
   */
  address1AddressTypeKey?: UserAddress1AddressTypeKey;
  /**
   * @displayName Address 1: County
   */
  address1County?: string;
  /**
   * @displayName Address 1: Fax
   */
  address1Fax?: string;
  /**
   * @displayName Address 1: Latitude
   */
  address1Latitude?: number;
  /**
   * @displayName Address 1: Longitude
   */
  address1Longitude?: number;
  /**
   * @displayName Address 1: Name
   */
  address1Name?: string;
  /**
   * @displayName Address 1: Post Office Box
   */
  address1PostOfficeBox?: string;
  /**
   * @displayName Address 1: Shipping Method
   */
  address1ShippingMethodKey?: UserAddress1ShippingMethodKey;
  /**
   * @displayName Address 1: UPS Zone
   */
  address1UPSZone?: string;
  /**
   * @displayName Address 1: UTC Offset
   */
  address1UTCOffset?: number;
  /**
   * @displayName Address 2: Address Type
   */
  address2AddressTypeKey?: UserAddress2AddressTypeKey;
  /**
   * @displayName Address 2: County
   */
  address2County?: string;
  /**
   * @displayName Address 2: Fax
   */
  address2Fax?: string;
  /**
   * @displayName Address 2: Latitude
   */
  address2Latitude?: number;
  /**
   * @displayName Address 2: Longitude
   */
  address2Longitude?: number;
  /**
   * @displayName Address 2: Name
   */
  address2Name?: string;
  /**
   * @displayName Address 2: Post Office Box
   */
  address2PostOfficeBox?: string;
  /**
   * @displayName Address 2: Shipping Method
   */
  address2ShippingMethodKey?: UserAddress2ShippingMethodKey;
  /**
   * @displayName Address 2: Telephone 1
   */
  address2Telephone1?: string;
  /**
   * @displayName Address 2: Telephone 2
   */
  address2Telephone2?: string;
  /**
   * @displayName Address 2: Telephone 3
   */
  address2Telephone3?: string;
  /**
   * @displayName Address 2: UPS Zone
   */
  address2UPSZone?: string;
  /**
   * @displayName Address 2: UTC Offset
   */
  address2UTCOffset?: number;
  /**
   * @displayName Application ID
   */
  applicationID?: string;
  /**
   * @displayName Application ID URI
   */
  applicationIDURI?: string;
  /**
   * @displayName Azure AD Object ID
   */
  azureADObjectID?: string;
  /**
   * @displayName Azure Deleted On
   */
  azureDeletedOn?: string;
  /**
   * @displayName Azure State
   * @validationRule Required for create/update operations
   */
  azureStateKey: UserAzureStateKey;
  /**
   * @displayName Business Unit
   * @validationRule Required for create/update operations
   */
  businessUnit: Pick<BusinessUnit, 'id' | 'name1'>;
  /**
   * @displayName Calendar
   */
  calendar?: Pick<Calendar, 'id' | 'name1'>;
  /**
   * @displayName City
   */
  city?: string;
  /**
   * @displayName Company
   */
  company?: Pick<Company, 'id' | 'companyCode'>;
  /**
   * @displayName Country/Region
   */
  countryRegion?: string;
  /**
   * @displayName Currency
   */
  currency?: Pick<Currency, 'id' | 'currencyName'>;
  /**
   * @displayName Default Filters Populated
   * @validationRule Required for create/update operations
   */
  defaultFiltersPopulated: boolean;
  /**
   * @displayName Default OneDrive for Business Folder Name
   * @validationRule Required for create/update operations
   */
  defaultOneDriveForBusinessFolderName: string;
  /**
   * @displayName Default Queue
   */
  defaultQueue?: Pick<Queue, 'id' | 'name1'>;
  /**
   * @displayName Deleted State
   * @validationRule Required for create/update operations
   */
  deletedStateKey: UserDeletedStateKey;
  /**
   * @displayName (Deprecated) Process Stage
   */
  deprecatedProcessStage?: string;
  /**
   * @displayName (Deprecated) Traversed Path
   */
  deprecatedTraversedPath?: string;
  /**
   * @displayName Disabled Reason
   */
  disabledReason?: string;
  /**
   * @displayName Display in Service Views
   */
  displayInServiceViews?: boolean;
  /**
   * @displayName Email 2
   */
  email2?: string;
  /**
   * @displayName Email Address O365 Admin Approval Status
   * @validationRule Required for create/update operations
   */
  emailAddressO365AdminApprovalStatus: boolean;
  /**
   * @displayName Employee
   */
  employee?: string;
  /**
   * @displayName Entity Image Id
   */
  entityImageId?: string;
  /**
   * @displayName Exchange Rate
   */
  exchangeRate?: number;
  /**
   * @displayName First Name
   * @validationRule Required for create/update operations
   */
  firstName: string;
  /**
   * @displayName Government
   */
  government?: string;
  /**
   * @displayName Home Phone
   */
  homePhone?: string;
  /**
   * @displayName Incoming Email Delivery Method
   * @validationRule Required for create/update operations
   */
  incomingEmailDeliveryMethodKey: UserIncomingEmailDeliveryMethodKey;
  /**
   * @displayName Integration user mode
   * @validationRule Required for create/update operations
   */
  integrationUserMode: boolean;
  /**
   * @displayName Invitation Status
   * @validationRule Required for create/update operations
   */
  invitationStatusKey: UserInvitationStatusKey;
  /**
   * @displayName Job Title
   */
  jobTitle?: string;
  /**
   * @displayName Last Name
   * @validationRule Required for create/update operations
   */
  lastName: string;
  /**
   * @displayName License Type
   * @validationRule Required for create/update operations
   */
  licenseTypeKey: UserLicenseTypeKey;
  /**
   * @displayName Mailbox
   */
  mailbox?: Pick<Mailbox, 'id' | 'name1'>;
  /**
   * @displayName Main Phone
   */
  mainPhone?: string;
  /**
   * @displayName Manager
   */
  manager?: Pick<User, 'id' | 'fullName'>;
  /**
   * @displayName Middle Name
   */
  middleName?: string;
  /**
   * @displayName Mobile Alert Email
   */
  mobileAlertEmail?: string;
  /**
   * @displayName Mobile Offline Profile
   */
  mobileOfflineProfile?: Pick<MobileOfflineProfile, 'id' | 'name1'>;
  /**
   * @displayName Mobile Phone
   */
  mobilePhone?: string;
  /**
   * @displayName Nickname
   */
  nickname?: string;
  /**
   * @displayName Organization 
   * @validationRule Required for create/update operations
   */
  organization: string;
  /**
   * @displayName Other City
   */
  otherCity?: string;
  /**
   * @displayName Other Country/Region
   */
  otherCountryRegion?: string;
  /**
   * @displayName Other Phone
   */
  otherPhone?: string;
  /**
   * @displayName Other State/Province
   */
  otherStateProvince?: string;
  /**
   * @displayName Other Street 1
   */
  otherStreet1?: string;
  /**
   * @displayName Other Street 2
   */
  otherStreet2?: string;
  /**
   * @displayName Other Street 3
   */
  otherStreet3?: string;
  /**
   * @displayName Other ZIP/Postal Code
   */
  otherZIPPostalCode?: string;
  /**
   * @displayName Outgoing Email Delivery Method
   * @validationRule Required for create/update operations
   */
  outgoingEmailDeliveryMethodKey: UserOutgoingEmailDeliveryMethodKey;
  /**
   * @displayName Pager
   */
  pager?: string;
  /**
   * @displayName Passport Hi
   */
  passportHi?: number;
  /**
   * @displayName Passport Lo
   */
  passportLo?: number;
  /**
   * @displayName Photo URL
   */
  photoURL?: string;
  /**
   * @displayName Position
   */
  position?: Pick<Position, 'id' | 'name1'>;
  /**
   * @displayName Preferred Address
   */
  preferredAddressKey?: UserPreferredAddressKey;
  /**
   * @displayName Preferred Email
   */
  preferredEmailKey?: UserPreferredEmailKey;
  /**
   * @displayName Preferred Phone
   */
  preferredPhoneKey?: UserPreferredPhoneKey;
  /**
   * @displayName Primary Email
   * @validationRule Required for create/update operations
   */
  primaryEmail: string;
  /**
   * @displayName Primary Email Status
   * @validationRule Required for create/update operations
   */
  primaryEmailStatusKey: UserPrimaryEmailStatusKey;
  /**
   * @displayName Process
   */
  process?: string;
  /**
   * @displayName Restricted Access Mode
   * @validationRule Required for create/update operations
   */
  restrictedAccessMode: boolean;
  /**
   * @displayName Salutation
   */
  salutation?: string;
  /**
   * @displayName SharePoint Email Address
   */
  sharePointEmailAddress?: string;
  /**
   * @displayName Skills
   */
  skills?: string;
  /**
   * @displayName State/Province
   */
  stateProvince?: string;
  /**
   * @displayName Status
   */
  status?: boolean;
  /**
   * @displayName Street 1
   */
  street1?: string;
  /**
   * @displayName Street 2
   */
  street2?: string;
  /**
   * @displayName Street 3
   */
  street3?: string;
  /**
   * @displayName System Managed User Type
   * @validationRule Required for create/update operations
   */
  systemManagedUserTypeKey: UserSystemManagedUserTypeKey;
  /**
   * @displayName Territory
   */
  territory?: Pick<Territory, 'id' | 'territoryName'>;
  /**
   * @displayName Title
   */
  title?: string;
  /**
   * @displayName To bypass IP firewall restriction on the user
   */
  toBypassIPFirewallRestrictionOnTheUser?: boolean;
  /**
   * @displayName Unique user identity id
   * @validationRule Required for create/update operations
   */
  uniqueUserIdentityId: number;
  /**
   * @displayName User Licensed
   * @validationRule Required for create/update operations
   */
  userLicensed: boolean;
  /**
   * @displayName User License Type
   * @validationRule Required for create/update operations
   */
  userLicenseType: number;
  /**
   * @displayName User Name
   * @validationRule Required for create/update operations
   */
  userName: string;
  /**
   * @displayName User PUID
   */
  userPUID?: string;
  /**
   * @displayName User Synced
   * @validationRule Required for create/update operations
   */
  userSynced: boolean;
  /**
   * @displayName Windows Live ID
   */
  windowsLiveID?: string;
  /**
   * @displayName Yammer Email
   */
  yammerEmail?: string;
  /**
   * @displayName Yammer User ID
   */
  yammerUserID?: string;
  /**
   * @displayName ZIP/Postal Code
   */
  zIPPostalCode?: string;
}

export const _User = 'User' as const;