export const DOCUMENTS_BUCKET = "documents";

export function sanitizeObjectName(name: string): string {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .trim();
  return cleaned || "document.pdf";
}

export function buildStoragePath(
  userId: string,
  documentId: string,
  fileName: string,
): string {
  return `${userId}/${documentId}/${sanitizeObjectName(fileName)}`;
}
