import { useCallback, useRef, useState } from "react";

import { SharePointUploadService } from "./SharePointUploadService";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILE_SIZE_MB,
  type DocumentUploadMetadata,
  type DocumentUploadResult,
  type UploadState,
} from "./types";

export const useDocumentUpload = () => {
  const controllerRef = useRef<AbortController | null>(null);
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    error: null,
    result: null,
  });

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File must be ${MAX_FILE_SIZE_MB} MB or smaller.`;
    }

    return null;
  }, []);

  const upload = useCallback(
    async (
      file: File,
      metadata: DocumentUploadMetadata,
    ): Promise<DocumentUploadResult> => {
      const validationError = validateFile(file);

      if (validationError) {
        setState({ isUploading: false, error: validationError, result: null });
        throw new Error(validationError);
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      setState({ isUploading: true, error: null, result: null });

      try {
        const sharePoint = await SharePointUploadService.uploadFile(
          file,
          metadata,
          controller.signal,
        );

        const result: DocumentUploadResult = {
          sharePoint,
          dataverseDocumentId: metadata.dataverseDocumentId,
        };

        setState({ isUploading: false, error: null, result });
        return result;
      } catch (error) {
        if (controller.signal.aborted) {
          const cancelled = new DOMException(
            "Upload cancelled.",
            "AbortError",
          );
          setState({ isUploading: false, error: cancelled.message, result: null });
          throw cancelled;
        }

        const message =
          error instanceof Error ? error.message : "Document upload failed.";

        setState({ isUploading: false, error: message, result: null });
        throw error instanceof Error ? error : new Error(message);
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
        }
      }
    },
    [validateFile],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({ isUploading: false, error: null, result: null });
  }, []);

  return {
    ...state,
    upload,
    cancel,
    reset,
    maxFileSizeMb: MAX_FILE_SIZE_MB,
  };
};
