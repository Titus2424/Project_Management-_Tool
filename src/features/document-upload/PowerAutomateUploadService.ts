import { getClient } from "@microsoft/power-apps/data";
import { dataSourcesInfo } from "../../../.power/appschemas/dataSourcesInfo";

export type UploadDocumentFlowRequest = {
  fileNameWithExtension: string;
  fileContentBase64: string;
  projectCode: string;
  taskId: string;
  dataverseDocumentId?: string;
  documentStatus: string;
};

export type UploadDocumentFlowResponse = {
  sharePointFileUrl: string;
  sharePointFileId: string;
  serverRelativeUrl?: string;
};

export type UpdateMetadataFlowRequest = {
  sharePointFileId: string;
  dataverseDocumentId: string;
  projectCode: string;
  documentStatus: string;
};

const FLOW_DATA_SOURCE_NAME =
  import.meta.env.VITE_UPLOAD_FLOW_DATASOURCE_NAME ??
  "UploadDocumentToSharePoint";
const FLOW_UPLOAD_OPERATION_NAME =
  import.meta.env.VITE_UPLOAD_FLOW_UPLOAD_OPERATION_NAME ?? "Run";
const FLOW_UPDATE_OPERATION_NAME =
  import.meta.env.VITE_UPLOAD_FLOW_UPDATE_OPERATION_NAME ?? "UpdateMetadata";

function parseFlowResponse(data: unknown): UploadDocumentFlowResponse {
  const candidate =
    typeof data === "object" &&
    data !== null &&
    "body" in (data as Record<string, unknown>)
      ? (data as Record<string, unknown>).body
      : data;

  if (!candidate || typeof candidate !== "object") {
    throw new Error(
      "Power Automate flow returned an unexpected response payload.",
    );
  }

  const record = candidate as Record<string, unknown>;
  const url = record.sharePointFileUrl;
  const fileId = record.sharePointFileId;
  const relativeUrl = record.serverRelativeUrl;

  if (typeof url !== "string" || typeof fileId !== "string") {
    throw new Error(
      "Flow response must include sharePointFileUrl and sharePointFileId.",
    );
  }

  return {
    sharePointFileUrl: url,
    sharePointFileId: fileId,
    serverRelativeUrl:
      typeof relativeUrl === "string" ? relativeUrl : undefined,
  };
}

export class PowerAutomateUploadService {
  private static readonly client = getClient(dataSourcesInfo);

  static async uploadBase64File(
    request: UploadDocumentFlowRequest,
  ): Promise<UploadDocumentFlowResponse> {
    const response = await this.client.executeAsync<
      UploadDocumentFlowRequest,
      unknown
    >({
      connectorOperation: {
        tableName: FLOW_DATA_SOURCE_NAME,
        operationName: FLOW_UPLOAD_OPERATION_NAME,
        parameters: request,
      },
    });

    if (!response.success) {
      throw new Error(
        `Upload flow call failed. Ensure the Power Automate flow datasource '${FLOW_DATA_SOURCE_NAME}' is added to the app and operation '${FLOW_UPLOAD_OPERATION_NAME}' exists. ${response.error instanceof Error ? response.error.message : ""}`.trim(),
      );
    }

    return parseFlowResponse(response.data);
  }

  static async updateSharePointMetadata(
    request: UpdateMetadataFlowRequest,
  ): Promise<void> {
    const response = await this.client.executeAsync<
      UpdateMetadataFlowRequest,
      unknown
    >({
      connectorOperation: {
        tableName: FLOW_DATA_SOURCE_NAME,
        operationName: FLOW_UPDATE_OPERATION_NAME,
        parameters: request,
      },
    });

    if (!response.success) {
      throw new Error(
        `Metadata flow call failed. Ensure operation '${FLOW_UPDATE_OPERATION_NAME}' exists in datasource '${FLOW_DATA_SOURCE_NAME}'. ${response.error instanceof Error ? response.error.message : ""}`.trim(),
      );
    }
  }
}

export async function toBase64WithoutPrefix(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read selected file."));
    reader.onload = () => {
      const value = reader.result;
      if (typeof value !== "string") {
        reject(new Error("Could not convert file to base64."));
        return;
      }
      const commaIndex = value.indexOf(",");
      resolve(commaIndex >= 0 ? value.slice(commaIndex + 1) : value);
    };
    reader.readAsDataURL(file);
  });
}
