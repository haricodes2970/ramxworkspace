import { appConfig } from "@/lib/env";

export type CloudPdfValidationResult =
  | { ok: true; file: File }
  | { ok: false; error: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function maxUploadLabel(): string {
  return `${Math.round(appConfig.maxUploadBytes / (1024 * 1024))} MB`;
}

export function validateCloudPdfFile(file: File): CloudPdfValidationResult {
  if (file.size === 0) {
    return { ok: false, error: "This file is empty." };
  }

  if (file.size > appConfig.maxUploadBytes) {
    return {
      ok: false,
      error: `That PDF is larger than the current upload limit (${maxUploadLabel()}).`,
    };
  }

  if (file.type && !file.type.toLowerCase().includes("pdf")) {
    return { ok: false, error: "Only PDF files are supported right now." };
  }

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, error: "Only PDF files are supported right now." };
  }

  return { ok: true, file };
}
