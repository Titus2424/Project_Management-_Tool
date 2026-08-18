export interface SharePointPerson {
  email: string;
  claims: string;
  displayName?: string;
}

export interface DocumentUploadMetadata {
  title: string;
  description?: string;
  taskReference?: string;
  documentType: string;
  documentStatus: string;
  approverEmail?: string;
  projectCode?: string;
  dataverseDocumentId: string;
  remarks?: string;
  uploadedByEmail?: string;
}

export interface SharePointUploadResult {
  fileId: string;
  itemId: number;
  fileName: string;
  fileUrl: string;
  path?: string;
  createResponseKeys: string[];
  lookupResponseKeys: string[];
}

export interface DocumentUploadResult {
  sharePoint: SharePointUploadResult;
  dataverseDocumentId: string;
}

export interface UploadState {
  isUploading: boolean;
  error: string | null;
  result: DocumentUploadResult | null;
}

export interface ChoiceOption {
  value: string;
  label: string;
}

/**
 * Keep these values aligned with the actual SharePoint internal names.
 * The CLI-generated dataSourcesInfo.ts is the source of truth after the
 * SharePoint library is added to the Code App.
 */
export const SHAREPOINT_LIBRARY_NAME = "ProjectDocuments";
const env = import.meta.env as Record<string, string | undefined>;
export const SHAREPOINT_SITE_URL =
  env.dmeo_ProjectDocumentLibrary ??
  env.VITE_dmeo_ProjectDocumentLibrary ??
  "https://myui.sharepoint.com/sites/Trial_Site";
export const SHAREPOINT_LIBRARY_FROM_ENV =
  env.dmeo_ProjectDocLibrary ?? env.VITE_dmeo_ProjectDocLibrary;

export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".dwg",
  ".dxf",
] as const;

export const DOCUMENT_TYPE_OPTIONS: ChoiceOption[] = [
  { value: "Drawing", label: "Drawing" },
  { value: "Specification", label: "Specification" },
  { value: "Contract", label: "Contract" },
  { value: "Report", label: "Report" },
  { value: "Other", label: "Other" },
];

export const DOCUMENT_STATUS_OPTIONS: ChoiceOption[] = [
  { value: "Draft", label: "Draft" },
  { value: "Submitted", label: "Submitted" },
  { value: "Approved", label: "Approved" },
  { value: "Rejected", label: "Rejected" },
];

export const SHAREPOINT_COLUMNS = {
  title: "Title",
  description: "Description",
  taskReference: "Task_x0020_Reference",
  documentType: "Document_x0020_Type",
  documentStatus: "Document_x0020_Status",
  approver: "Approver",
  projectCode: "Project_x0020_Code",
  dataverseDocumentId: "Dataverse_x0020_Document_x0020_ID",
  remarks: "Remarks",
  uploadedBy: "Uploaded_x0020_By",
} as const;

export interface CreateFileResponse {
  Id: string;
  ItemId?: number;
  Name?: string;
  DisplayName?: string;
  Path?: string;
  FileLocator?: string;
  "{Link}"?: string;
  "{Identifier}"?: string;
  UniqueId?: string;
}

export interface Office365UserProfile {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

export interface PowerAppsConnectionConfig {
  apiId: string;
  runtimeUrl: string;
  connectionName: string;
  datasetName: string;
}

export type PowerAppsConnectionConfigMap =
  Record<string, PowerAppsConnectionConfig>;

export interface PluginHttpRequest {
  url: string;
  method: "POST" | "GET";
  requestSource: "PublishedApp";
  allowSessionStorage: boolean;
  returnDirectResponse: boolean;
  headers: Record<string, string>;
}

export interface PluginHttpResponse {
  status?: number;
  statusCode?: number;
  body?: unknown;
  data?: unknown;
}
