import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

import { CTSDocumentService } from "@/generated/services/cts-document-service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { useDocumentUpload } from "./useDocumentUpload";
import {
  ALLOWED_FILE_EXTENSIONS,
  DOCUMENT_STATUS_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  type DocumentUploadMetadata,
} from "./types";

export interface DocumentUploadProps {
  dataverseDocumentId: string;
  projectCode?: string;
  taskReference?: string;
  onCompleted?: (result: {
    sharePointFileId: string;
    sharePointFileUrl: string;
    dataverseDocumentId: string;
  }) => void;
}

const emptyMetadata = (
  dataverseDocumentId: string,
  projectCode?: string,
  taskReference?: string,
): DocumentUploadMetadata => ({
  title: "",
  description: "",
  taskReference: taskReference ?? "",
  documentType: DOCUMENT_TYPE_OPTIONS[0]?.value ?? "",
  documentStatus: DOCUMENT_STATUS_OPTIONS[0]?.value ?? "",
  approverEmail: "",
  projectCode: projectCode ?? "",
  dataverseDocumentId,
  remarks: "",
});

export default function DocumentUpload({
  dataverseDocumentId,
  projectCode,
  taskReference,
  onCompleted,
}: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<DocumentUploadMetadata>(() =>
    emptyMetadata(dataverseDocumentId, projectCode, taskReference),
  );
  const [isDragging, setIsDragging] = useState(false);
  const { isUploading, error, result, upload, cancel, reset, maxFileSizeMb } =
    useDocumentUpload();

  const accept = useMemo(
    () => ALLOWED_FILE_EXTENSIONS.join(","),
    [],
  );

  const selectFile = useCallback(
    (selected: File | undefined) => {
      if (!selected) return;

      if (selected.size > maxFileSizeMb * 1024 * 1024) {
        toast.error(`File must be ${maxFileSizeMb} MB or smaller.`);
        return;
      }

      setFile(selected);
      setMetadata((current) => ({
        ...current,
        title: current.title || selected.name.replace(/\.[^.]+$/, ""),
      }));
      reset();
    },
    [maxFileSizeMb, reset],
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const setField = <K extends keyof DocumentUploadMetadata>(
    field: K,
    value: DocumentUploadMetadata[K],
  ) => {
    setMetadata((current) => ({ ...current, [field]: value }));
  };

  const submit = async () => {
    if (!file) {
      toast.error("Select a document before uploading.");
      return;
    }

    if (!metadata.title.trim()) {
      toast.error("Title is required.");
      return;
    }

    try {
      const uploadResult = await upload(file, metadata);

      // Update the existing Dataverse Documents record with the SharePoint URL/ID.
      await CTSDocumentService.update(metadata.dataverseDocumentId, {
        documentURL: uploadResult.sharePoint.fileUrl,
        sharePointFileID: uploadResult.sharePoint.fileId,
        documentName: file.name,
        fileSizeMB: Number((file.size / 1024 / 1024).toFixed(3)),
        comments: metadata.description,
        statusKey: metadata.documentStatus as
          | "Draft"
          | "Submitted"
          | "Approved"
          | "Rejected"
          | "RevisionRequired",
      });

      toast.success("Document uploaded successfully.");
      onCompleted?.({
        sharePointFileId: uploadResult.sharePoint.fileId,
        sharePointFileUrl: uploadResult.sharePoint.fileUrl,
        dataverseDocumentId: metadata.dataverseDocumentId,
      });
    } catch (uploadError) {
      if (
        uploadError instanceof DOMException &&
        uploadError.name === "AbortError"
      ) {
        toast.info("Upload cancelled.");
        return;
      }

      toast.error(
        uploadError instanceof Error
          ? uploadError.message
          : "Document upload failed.",
      );
    }
  };

  const retry = () => {
    reset();
    void submit();
  };

  return (
    <section className="space-y-6 rounded-xl border p-6">
      <div>
        <h2 className="text-xl font-semibold">Upload Design Document</h2>
        <p className="text-sm text-muted-foreground">
          Single-upload limit: {maxFileSizeMb} MB.
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`rounded-lg border-2 border-dashed p-8 text-center ${
          isDragging ? "border-primary bg-muted/40" : ""
        }`}
      >
        <p className="mb-3 text-sm">
          Drag and drop a document here, or choose a file.
        </p>
        <Input
          type="file"
          accept={accept}
          onChange={onFileChange}
          disabled={isUploading}
          className="mx-auto max-w-md"
        />
        {file && (
          <p className="mt-3 text-sm">
            <strong>{file.name}</strong> —{" "}
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Title *</span>
          <Input
            value={metadata.title}
            onChange={(e) => setField("title", e.target.value)}
            disabled={isUploading}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Task Reference</span>
          <Input
            value={metadata.taskReference ?? ""}
            onChange={(e) => setField("taskReference", e.target.value)}
            disabled={isUploading}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Document Type *</span>
          <select
            value={metadata.documentType}
            onChange={(e) => setField("documentType", e.target.value)}
            disabled={isUploading}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Document Status *</span>
          <select
            value={metadata.documentStatus}
            onChange={(e) => setField("documentStatus", e.target.value)}
            disabled={isUploading}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            {DOCUMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Approver Email</span>
          <Input
            type="email"
            value={metadata.approverEmail ?? ""}
            onChange={(e) => setField("approverEmail", e.target.value)}
            disabled={isUploading}
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium">Project Code</span>
          <Input
            value={metadata.projectCode ?? ""}
            onChange={(e) => setField("projectCode", e.target.value)}
            disabled={isUploading}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Description</span>
          <Textarea
            value={metadata.description ?? ""}
            onChange={(e) => setField("description", e.target.value)}
            disabled={isUploading}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-sm font-medium">Remarks</span>
          <Textarea
            value={metadata.remarks ?? ""}
            onChange={(e) => setField("remarks", e.target.value)}
            disabled={isUploading}
          />
        </label>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p>{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={retry}
            disabled={!file || isUploading}
          >
            Retry
          </Button>
        </div>
      )}

      {result && (
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">Upload completed.</p>
          <a
            href={result.sharePoint.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            Open SharePoint document
          </a>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          onClick={() => void submit()}
          disabled={!file || isUploading}
        >
          {isUploading ? "Uploading..." : "Upload Document"}
        </Button>

        {isUploading && (
          <Button type="button" variant="outline" onClick={cancel}>
            Cancel
          </Button>
        )}
      </div>
    </section>
  );
}
