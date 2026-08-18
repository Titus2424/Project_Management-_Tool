import { getContext } from "@microsoft/power-apps/app";
import { getClient } from "@microsoft/power-apps/data";
import { executePluginAsync } from "@microsoft/power-apps/dist/internal/plugins/PluginBridge.js";

import { dataSourcesInfo } from "../../../.power/appschemas/dataSourcesInfo";
import {
  ALLOWED_FILE_EXTENSIONS,
  SHAREPOINT_COLUMNS,
  SHAREPOINT_LIBRARY_NAME,
  SHAREPOINT_SITE_URL,
  type CreateFileResponse,
  type DocumentUploadMetadata,
  type Office365UserProfile,
  type PluginHttpRequest,
  type PowerAppsConnectionConfigMap,
  type SharePointPerson,
  type SharePointUploadResult,
} from "./types";

const SHAREPOINT_API_ID = "shared_sharepointonline";
const SHAREPOINT_DATA_SOURCE_NAME = SHAREPOINT_LIBRARY_NAME;
const OFFICE365_USERS_DATA_SOURCE_NAME = "Office365Users";
const OFFICE365_USERS_PROFILE_OPERATION = "MyProfile_V2";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function parseCreateFileResponse(value: unknown): CreateFileResponse {
  const candidate =
    isRecord(value) && "body" in value ? value.body : value;

  if (Array.isArray(candidate)) {
    const first = candidate[0];
    if (isRecord(first)) {
      return {
        Id: getString(first.Id) ?? getString(first.FileLocator) ?? "",
        ItemId: getNumber(first.ItemId),
        Name: getString(first.Name),
        DisplayName: getString(first.DisplayName),
        Path: getString(first.Path),
        FileLocator: getString(first.FileLocator),
        "{Link}": getString(first["{Link}"]),
      };
    }
  }

  if (!isRecord(candidate)) {
    throw new Error("SharePoint CreateFile returned an unexpected response.");
  }

  return {
    Id: getString(candidate.Id) ?? getString(candidate.FileLocator) ?? "",
    ItemId: getNumber(candidate.ItemId),
    Name: getString(candidate.Name),
    DisplayName: getString(candidate.DisplayName),
    Path: getString(candidate.Path),
    FileLocator: getString(candidate.FileLocator),
    "{Link}": getString(candidate["{Link}"]),
  };
}

function claimsFor(email: string): string {
  return `i:0#.f|membership|${email}`;
}

function normalizeExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

function validateFile(file: File): void {
  const maxBytes = 4 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error("File is larger than the 4 MB upload limit.");
  }

  const extension = normalizeExtension(file.name);
  if (
    extension.length > 0 &&
    !ALLOWED_FILE_EXTENSIONS.includes(
      extension as (typeof ALLOWED_FILE_EXTENSIONS)[number],
    )
  ) {
    throw new Error(`File type ${extension} is not allowed.`);
  }
}

export class SharePointUploadService {
  private static readonly client = getClient(dataSourcesInfo);

  /**
   * Resolves the SharePoint connector runtime configuration.
   * This is an internal Power Apps runtime bridge used only because the
   * public connector executeAsync path serializes request bodies and is not
   * suitable for raw binary CreateFile payloads.
   */
  private static async getSharePointConnection(): Promise<{
    runtimeUrl: string;
    connectionName: string;
    datasetName: string;
    apiId: string;
  }> {
    const configs = await executePluginAsync<PowerAppsConnectionConfigMap>(
      "AppPowerAppsClientPlugin",
      "loadAppConnectionsAsync_v2",
      [],
    );

    const entry = Object.values(configs).find(
      (config) => config.apiId === SHAREPOINT_API_ID,
    );

    if (!entry) {
      throw new Error(
        "SharePoint connection was not found. Add shared_sharepointonline to the Code App first.",
      );
    }

    return entry;
  }

  /**
   * Resolves the current user through Office 365 Users. The Power Apps
   * host context is used only as a final fallback for the current identity.
   */
  private static async getCurrentUser(): Promise<SharePointPerson> {
    const profileResult = await this.client.executeAsync<
      Record<string, never>,
      Office365UserProfile
    >({
      connectorOperation: {
        tableName: OFFICE365_USERS_DATA_SOURCE_NAME,
        operationName: OFFICE365_USERS_PROFILE_OPERATION,
        parameters: {},
      },
    });

    if (profileResult.success) {
      const profile = profileResult.data;
      const email = profile.mail ?? profile.userPrincipalName;
      if (email) {
        return {
          email,
          claims: claimsFor(email),
          displayName: profile.displayName,
        };
      }
    }

    const context = await getContext();
    const email = context.user.userPrincipalName;

    if (!email) {
      throw new Error("Unable to resolve the signed-in user's email.");
    }

    return {
      email,
      claims: claimsFor(email),
      displayName: context.user.fullName,
    };
  }

  /**
   * Uploads one <=4 MB file in one SharePoint CreateFile request.
   *
   * IMPORTANT: the public @microsoft/power-apps executeAsync API is used for
   * connector operations generally, but raw binary SharePoint CreateFile
   * requires the runtime HTTP bridge so the ArrayBuffer/Blob is not JSON
   * serialized. This still executes through the configured SharePoint
   * connector and signed-in-user runtime authentication.
   */
  public static async uploadFile(
    file: File,
    metadata: DocumentUploadMetadata,
    signal?: AbortSignal,
  ): Promise<SharePointUploadResult> {
    validateFile(file);

    if (signal?.aborted) {
      throw new DOMException("Upload cancelled.", "AbortError");
    }

    const connection = await this.getSharePointConnection();
    const fileBuffer = await file.arrayBuffer();

    if (signal?.aborted) {
      throw new DOMException("Upload cancelled.", "AbortError");
    }

    const encodedDataset = encodeURIComponent(
      encodeURIComponent(connection.datasetName),
    );
    const folderPath = encodeURIComponent(`/${SHAREPOINT_LIBRARY_NAME}`);
    const fileName = encodeURIComponent(file.name);

    const uploadUrl =
      `${connection.runtimeUrl}/${connection.connectionName}` +
      `/datasets/${encodedDataset}/files` +
      `?folderPath=${folderPath}&name=${fileName}`;

    const request: PluginHttpRequest = {
      url: uploadUrl,
      method: "POST",
      requestSource: "PublishedApp",
      allowSessionStorage: true,
      returnDirectResponse: true,
      headers: {
        Accept: "application/json",
        "x-ms-protocol-semantics": "cdp",
        ServiceNamespace: "documents",
        Authorization: "",
        "Content-Type": file.type || "application/octet-stream",
      },
    };

    const token = await executePluginAsync<string>(
      "AppIdentityServicePlugin",
      "getAppAccessTokenAsync",
      [connection.apiId],
    );

    request.headers.Authorization = `paauth ${token}`;

    const fileBlob = new Blob([fileBuffer], {
      type: file.type || "application/octet-stream",
    });

    // Single CreateFile request with the raw Blob body. No base64 and no chunking.
    const response = await executePluginAsync<unknown>(
      "AppHttpClientPlugin",
      "sendHttpAsync",
      [request, fileBlob, "arraybuffer"],
    );

    if (signal?.aborted) {
      throw new DOMException("Upload cancelled.", "AbortError");
    }

    const created = parseCreateFileResponse(response);
    const fileId = created.Id;
    const itemId = created.ItemId;

    if (!fileId || itemId === undefined) {
      throw new Error(
        "SharePoint created the file but did not return the file/item identifiers.",
      );
    }

    const uploadedBy = metadata.uploadedByEmail
      ? {
          email: metadata.uploadedByEmail,
          claims: claimsFor(metadata.uploadedByEmail),
        }
      : await this.getCurrentUser();

    const approver = metadata.approverEmail
      ? {
          email: metadata.approverEmail,
          claims: claimsFor(metadata.approverEmail),
        }
      : undefined;

    const patchParameters: Record<string, unknown> = {
      dataset: SHAREPOINT_SITE_URL,
      table: SHAREPOINT_LIBRARY_NAME,
      id: itemId,
      [`item/${SHAREPOINT_COLUMNS.title}`]: metadata.title,
      [`item/${SHAREPOINT_COLUMNS.description}`]: metadata.description ?? "",
      [`item/${SHAREPOINT_COLUMNS.taskReference}`]:
        metadata.taskReference ?? "",
      [`item/${SHAREPOINT_COLUMNS.documentType}`]: metadata.documentType,
      [`item/${SHAREPOINT_COLUMNS.documentStatus}`]: metadata.documentStatus,
      [`item/${SHAREPOINT_COLUMNS.projectCode}`]: metadata.projectCode ?? "",
      [`item/${SHAREPOINT_COLUMNS.dataverseDocumentId}`]:
        metadata.dataverseDocumentId,
      [`item/${SHAREPOINT_COLUMNS.remarks}`]: metadata.remarks ?? "",
      [`item/${SHAREPOINT_COLUMNS.uploadedBy}`]: uploadedBy.claims,
    };

    if (approver) {
      patchParameters[`item/${SHAREPOINT_COLUMNS.approver}`] =
        approver.claims;
    }

    // Update file properties using the generated SharePoint connector operation.
    const patchResult = await SharePointUploadService.client.executeAsync<
      Record<string, unknown>,
      unknown
    >({
      connectorOperation: {
        tableName: SHAREPOINT_DATA_SOURCE_NAME,
        operationName: "PatchFileItem",
        parameters: patchParameters,
      },
    });

    if (!patchResult.success) {
      throw patchResult.error;
    }

    const fileUrl =
      created["{Link}"] ??
      (created.Path
        ? new URL(
            created.Path.replace(/^\/+/, ""),
            `${connection.datasetName}/`,
          ).toString()
        : "");

    if (!fileUrl) {
      throw new Error(
        "File upload succeeded, but SharePoint did not return a usable file URL.",
      );
    }

    return {
      fileId,
      itemId,
      fileName: created.Name ?? file.name,
      fileUrl,
      path: created.Path,
    };
  }
}
