import { getClient } from "@microsoft/power-apps/data";
import { executePluginAsync } from "@microsoft/power-apps/internal/plugins";

import { dataSourcesInfo } from "../../../.power/appschemas/dataSourcesInfo";
import {
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  SHAREPOINT_COLUMNS,
  SHAREPOINT_LIBRARY_FROM_ENV,
  SHAREPOINT_LIBRARY_NAME,
  SHAREPOINT_SITE_URL,
  type CreateFileResponse,
  type DocumentUploadMetadata,
  type PluginHttpRequest,
  type PowerAppsConnectionConfigMap,
  type SharePointUploadResult,
} from "./types";

type SharePointConnection = {
  runtimeUrl: string;
  connectionName: string;
  datasetName: string;
  apiId: string;
};

type ParsedConnectorResponse = {
  parsed: CreateFileResponse;
  keys: string[];
  rawRecord: Record<string, unknown> | undefined;
};

const SHAREPOINT_API_ID = "shared_sharepointonline";
const SHAREPOINT_DATA_SOURCE_NAME =
  SHAREPOINT_LIBRARY_FROM_ENV || "projectdocuments";
const SHAREPOINT_LIBRARY_FOLDER_NAME =
  SHAREPOINT_LIBRARY_FROM_ENV || SHAREPOINT_LIBRARY_NAME;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function parseJsonIfNeeded(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function unwrapConnectorBody(value: unknown): unknown {
  const parsed = parseJsonIfNeeded(value);
  const record = isRecord(parsed) ? parsed : undefined;
  if (!record) return parsed;
  if ("body" in record) return unwrapConnectorBody(record.body);
  if ("data" in record) return unwrapConnectorBody(record.data);
  return record;
}

function extractPrimaryRecord(
  value: unknown,
): { record: Record<string, unknown> | undefined; keys: string[] } {
  const body = unwrapConnectorBody(value);
  if (Array.isArray(body)) {
    const first = isRecord(body[0]) ? body[0] : undefined;
    return { record: first, keys: first ? Object.keys(first) : [] };
  }
  if (!isRecord(body)) return { record: undefined, keys: [] };
  if (Array.isArray(body.value)) {
    const first = isRecord(body.value[0]) ? body.value[0] : undefined;
    if (first) return { record: first, keys: Object.keys(first) };
  }
  const nestedD = isRecord(body.d) ? body.d : undefined;
  if (nestedD) return { record: nestedD, keys: Object.keys(nestedD) };
  return { record: body, keys: Object.keys(body) };
}

function pickFirstString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = getString(record[key]);
    if (value) return value;
  }
  return undefined;
}

function pickFirstNumber(
  record: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = getNumber(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function normalizePath(path: string): string {
  const normalized = decodeURIComponent(path)
    .replace(/\\/g, "/")
    .replace(/\/{2,}/g, "/");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function toAbsoluteUrl(path: string | undefined, datasetName: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const sitePath = new URL(SHAREPOINT_SITE_URL).pathname.replace(/\/$/, "");
  const normalized = normalizePath(path);
  const fullPath = normalized.toLowerCase().startsWith(sitePath.toLowerCase())
    ? normalized
    : `${sitePath}${normalized}`;
  return new URL(fullPath, datasetName).toString();
}

function deriveServerRelativePath(
  fileName: string,
  pathFromResponse: string | undefined,
  urlFromResponse: string | undefined,
): string {
  if (urlFromResponse) {
    try {
      return normalizePath(new URL(urlFromResponse).pathname);
    } catch {
      // no-op, fall back to other signals
    }
  }
  if (pathFromResponse) return normalizePath(pathFromResponse);
  const sitePath = new URL(SHAREPOINT_SITE_URL).pathname.replace(/\/$/, "");
  return normalizePath(`${sitePath}/${SHAREPOINT_LIBRARY_FOLDER_NAME}/${fileName}`);
}

function parseConnectorResponse(
  value: unknown,
  datasetName: string,
): ParsedConnectorResponse {
  const { record, keys } = extractPrimaryRecord(value);
  if (!record) {
    throw new Error("SharePoint connector returned an unexpected payload.");
  }
  const listItem = isRecord(record.ListItemAllFields)
    ? record.ListItemAllFields
    : isRecord(record.listItemAllFields)
      ? record.listItemAllFields
      : undefined;

  const fileId =
    pickFirstString(record, [
      "{Identifier}",
      "Identifier",
      "UniqueId",
      "UniqueID",
      "Id",
      "ID",
      "FileLocator",
      "ItemUniqueId",
    ]) ?? pickFirstString(listItem ?? {}, ["UniqueId", "UniqueID", "GUID"]);

  const itemId =
    pickFirstNumber(record, [
      "ItemId",
      "itemId",
      "ListItemId",
      "ListItemID",
      "ItemID",
    ]) ?? pickFirstNumber(listItem ?? {}, ["Id", "ID", "ItemId"]);

  const path =
    pickFirstString(record, [
      "{Path}",
      "Path",
      "ServerRelativeUrl",
      "FileRef",
      "FilePath",
    ]) ?? pickFirstString(listItem ?? {}, ["FileRef", "ServerRelativeUrl"]);

  const fileUrl =
    pickFirstString(record, ["{Link}", "LinkingUrl", "WebUrl", "webUrl"]) ??
    toAbsoluteUrl(path, datasetName);

  const name = pickFirstString(record, ["Name", "DisplayName"]);

  return {
    parsed: {
      Id: fileId ?? "",
      ItemId: itemId,
      Name: name,
      DisplayName: pickFirstString(record, ["DisplayName"]),
      Path: path,
      FileLocator: pickFirstString(record, ["FileLocator"]),
      "{Link}": fileUrl,
      "{Identifier}": pickFirstString(record, ["{Identifier}", "Identifier"]),
      UniqueId: pickFirstString(record, ["UniqueId", "UniqueID"]),
    },
    keys,
    rawRecord: record,
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
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File is larger than the 5 MB upload limit.");
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

  private static isSharePointApiId(apiId: string | undefined): boolean {
    const value = (apiId ?? "").toLowerCase();
    return value === SHAREPOINT_API_ID || value.includes(SHAREPOINT_API_ID);
  }

  private static async getSharePointConnection(): Promise<SharePointConnection> {
    const configs = await executePluginAsync<PowerAppsConnectionConfigMap>(
      "AppPowerAppsClientPlugin",
      "loadAppConnectionsAsync_v2",
      [],
    );
    const entry = Object.values(configs).find((config) =>
      this.isSharePointApiId(config.apiId),
    );
    if (!entry) {
      const availableApiIds = Object.values(configs)
        .map((config) => config.apiId)
        .filter(Boolean)
        .join(", ");
      throw new Error(
        `SharePoint connection was not found in runtime app connections. Add shared_sharepointonline to the Code App and run 'pac code push'. Available runtime API IDs: ${availableApiIds || "none"}.`,
      );
    }
    return entry;
  }

  private static async getConnectorToken(apiId: string): Promise<string> {
    return await executePluginAsync<string>(
      "AppIdentityServicePlugin",
      "getAppAccessTokenAsync",
      [apiId],
    );
  }

  private static async lookupFileByPath(
    connection: SharePointConnection,
    serverRelativePath: string,
  ): Promise<ParsedConnectorResponse> {
    const connectorLookupAttempts: Array<{
      operationName: string;
      parameters: Record<string, unknown>;
    }> = [
      {
        operationName: "GetFileMetadataByPath",
        parameters: { dataset: SHAREPOINT_SITE_URL, path: serverRelativePath },
      },
      {
        operationName: "GetFileMetadataUsingPath",
        parameters: { dataset: SHAREPOINT_SITE_URL, path: serverRelativePath },
      },
      {
        operationName: "GetFileProperties",
        parameters: {
          dataset: SHAREPOINT_SITE_URL,
          table: SHAREPOINT_LIBRARY_FOLDER_NAME,
          path: serverRelativePath,
        },
      },
    ];

    for (const attempt of connectorLookupAttempts) {
      const result = await this.client.executeAsync<Record<string, unknown>, unknown>({
        connectorOperation: {
          tableName: SHAREPOINT_DATA_SOURCE_NAME,
          operationName: attempt.operationName,
          parameters: attempt.parameters,
        },
      });
      if (!result.success) continue;
      const parsed = parseConnectorResponse(result.data, connection.datasetName);
      if (parsed.parsed.Id || parsed.parsed.ItemId !== undefined || parsed.parsed["{Link}"]) {
        console.log("[CTS DEBUG] sharepoint metadata lookup", {
          lookupOperation: attempt.operationName,
          serverRelativePath,
          lookupResponseKeys: parsed.keys,
          lookupRecord: parsed.rawRecord,
        });
        return parsed;
      }
    }

    const encodedDataset = encodeURIComponent(
      encodeURIComponent(connection.datasetName),
    );
    const lookupUrl =
      `${connection.runtimeUrl}/${connection.connectionName}` +
      `/datasets/${encodedDataset}/GetFileMetadataByPath` +
      `?path=${encodeURIComponent(serverRelativePath)}`;
    const token = await this.getConnectorToken(connection.apiId);
    const request: PluginHttpRequest = {
      url: lookupUrl,
      method: "GET",
      requestSource: "PublishedApp",
      allowSessionStorage: true,
      returnDirectResponse: true,
      headers: {
        Accept: "application/json",
        "x-ms-protocol-semantics": "cdp",
        ServiceNamespace: "documents",
        Authorization: `paauth ${token}`,
        "Content-Type": "application/json",
      },
    };
    const response = await executePluginAsync<unknown>(
      "AppHttpClientPlugin",
      "sendHttpAsync",
      [request, "", "text"],
    );
    const parsed = parseConnectorResponse(response, connection.datasetName);
    console.log("[CTS DEBUG] sharepoint metadata lookup", {
      lookupOperation: "runtime:GetFileMetadataByPath",
      serverRelativePath,
      lookupResponseKeys: parsed.keys,
      lookupRecord: parsed.rawRecord,
    });
    return parsed;
  }

  public static async uploadFile(
    file: File,
    _metadata: DocumentUploadMetadata,
    signal?: AbortSignal,
  ): Promise<SharePointUploadResult> {
    validateFile(file);
    if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");

    const connection = await this.getSharePointConnection();
    const fileBuffer = await file.arrayBuffer();
    if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");

    const encodedDataset = encodeURIComponent(
      encodeURIComponent(connection.datasetName),
    );
    const folderPath = encodeURIComponent(`/${SHAREPOINT_LIBRARY_FOLDER_NAME}`);
    const fileName = encodeURIComponent(file.name);
    const uploadUrl =
      `${connection.runtimeUrl}/${connection.connectionName}` +
      `/datasets/${encodedDataset}/files` +
      `?folderPath=${folderPath}&name=${fileName}`;

    const token = await this.getConnectorToken(connection.apiId);
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
        Authorization: `paauth ${token}`,
        "Content-Type": file.type || "application/octet-stream",
      },
    };

    const fileBlob = new Blob([fileBuffer], {
      type: file.type || "application/octet-stream",
    });
    const createResponse = await executePluginAsync<unknown>(
      "AppHttpClientPlugin",
      "sendHttpAsync",
      [request, fileBlob, "arraybuffer"],
    );
    if (signal?.aborted) throw new DOMException("Upload cancelled.", "AbortError");

    const parsedCreate = parseConnectorResponse(
      createResponse,
      connection.datasetName,
    );
    console.log("[CTS DEBUG] sharepoint create response", {
      fileName: file.name,
      createResponseKeys: parsedCreate.keys,
      createResponseRecord: parsedCreate.rawRecord,
    });

    let resolvedFileId = parsedCreate.parsed.Id || parsedCreate.parsed.FileLocator;
    let resolvedItemId = parsedCreate.parsed.ItemId;
    let resolvedFileUrl = parsedCreate.parsed["{Link}"] ?? toAbsoluteUrl(parsedCreate.parsed.Path, connection.datasetName);
    let resolvedPath = parsedCreate.parsed.Path;
    let lookupResponseKeys: string[] = [];

    if (!resolvedFileId || resolvedItemId === undefined || !resolvedFileUrl) {
      const serverRelativePath = deriveServerRelativePath(
        file.name,
        resolvedPath,
        resolvedFileUrl,
      );
      const lookup = await this.lookupFileByPath(connection, serverRelativePath);
      lookupResponseKeys = lookup.keys;
      resolvedFileId = resolvedFileId || lookup.parsed.Id || lookup.parsed.FileLocator;
      resolvedItemId = resolvedItemId ?? lookup.parsed.ItemId;
      resolvedFileUrl =
        resolvedFileUrl ||
        lookup.parsed["{Link}"] ||
        toAbsoluteUrl(lookup.parsed.Path, connection.datasetName);
      resolvedPath = resolvedPath || lookup.parsed.Path || serverRelativePath;
    }

    if (!resolvedFileId) {
      throw new Error(
        "SharePoint created the file but did not return a usable file identifier even after metadata lookup.",
      );
    }
    if (resolvedItemId === undefined) {
      throw new Error(
        "SharePoint created the file but did not return a usable item identifier even after metadata lookup.",
      );
    }
    if (!resolvedFileUrl) {
      throw new Error(
        "SharePoint created the file but did not return a usable file URL even after metadata lookup.",
      );
    }

    return {
      fileId: resolvedFileId,
      itemId: resolvedItemId,
      fileName: parsedCreate.parsed.Name ?? file.name,
      fileUrl: resolvedFileUrl,
      path: resolvedPath,
      createResponseKeys: parsedCreate.keys,
      lookupResponseKeys,
    };
  }

  public static async resolveFileForRepair(
    fileName: string,
    fileUrl?: string,
  ): Promise<SharePointUploadResult> {
    const connection = await this.getSharePointConnection();
    const serverRelativePath = deriveServerRelativePath(fileName, undefined, fileUrl);
    const lookup = await this.lookupFileByPath(connection, serverRelativePath);

    const resolvedFileId = lookup.parsed.Id || lookup.parsed.FileLocator;
    const resolvedItemId = lookup.parsed.ItemId;
    const resolvedFileUrl =
      lookup.parsed["{Link}"] ||
      toAbsoluteUrl(lookup.parsed.Path ?? serverRelativePath, connection.datasetName);

    if (!resolvedFileId || resolvedItemId === undefined || !resolvedFileUrl) {
      throw new Error(
        `Could not resolve SharePoint file identifiers for ${fileName}. lookupKeys=${lookup.keys.join(",")}`,
      );
    }

    return {
      fileId: resolvedFileId,
      itemId: resolvedItemId,
      fileName,
      fileUrl: resolvedFileUrl,
      path: lookup.parsed.Path ?? serverRelativePath,
      createResponseKeys: [],
      lookupResponseKeys: lookup.keys,
    };
  }

  public static async updateFileMetadata(
    itemId: number,
    metadata: DocumentUploadMetadata,
  ): Promise<void> {
    const patchParameters: Record<string, unknown> = {
      dataset: SHAREPOINT_SITE_URL,
      table: SHAREPOINT_LIBRARY_FOLDER_NAME,
      id: itemId,
      [`item/${SHAREPOINT_COLUMNS.title}`]: metadata.title,
      [`item/${SHAREPOINT_COLUMNS.description}`]: metadata.description ?? "",
      [`item/${SHAREPOINT_COLUMNS.taskReference}`]: metadata.taskReference ?? "",
      [`item/${SHAREPOINT_COLUMNS.documentType}`]: metadata.documentType,
      [`item/${SHAREPOINT_COLUMNS.documentStatus}`]: metadata.documentStatus,
      [`item/${SHAREPOINT_COLUMNS.projectCode}`]: metadata.projectCode ?? "",
      [`item/${SHAREPOINT_COLUMNS.dataverseDocumentId}`]:
        metadata.dataverseDocumentId,
      [`item/${SHAREPOINT_COLUMNS.remarks}`]: metadata.remarks ?? "",
    };

    if (metadata.uploadedByEmail) {
      patchParameters[`item/${SHAREPOINT_COLUMNS.uploadedBy}`] = claimsFor(
        metadata.uploadedByEmail,
      );
    }
    if (metadata.approverEmail) {
      patchParameters[`item/${SHAREPOINT_COLUMNS.approver}`] = claimsFor(
        metadata.approverEmail,
      );
    }

    const patchResult = await this.client.executeAsync<Record<string, unknown>, unknown>({
      connectorOperation: {
        tableName: SHAREPOINT_DATA_SOURCE_NAME,
        operationName: "PatchFileItem",
        parameters: patchParameters,
      },
    });

    if (!patchResult.success) {
      throw new Error(
        `SharePoint metadata update failed for itemId ${itemId}. ${patchResult.error instanceof Error ? patchResult.error.message : ""}`.trim(),
      );
    }
  }
}
