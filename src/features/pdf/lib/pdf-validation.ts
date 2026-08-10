export const MAX_PDF_SIZE = 100 * 1024 * 1024;

export type PdfValidationResult =
  | { ok: true; file: File }
  | { ok: false; error: string };

function isPdfName(file: File) {
  return file.name.toLowerCase().endsWith(".pdf");
}

export function validatePdfFile(file: File): PdfValidationResult {
  if (file.size === 0) {
    return { ok: false, error: "This file is empty." };
  }

  if (file.size > MAX_PDF_SIZE) {
    return {
      ok: false,
      error: "This file is larger than 100 MB. Choose a smaller PDF.",
    };
  }

  if (file.type && !file.type.toLowerCase().includes("pdf")) {
    return { ok: false, error: "This is not a PDF file. Choose a .pdf file." };
  }

  if (!isPdfName(file)) {
    return { ok: false, error: "This is not a PDF file. Choose a .pdf file." };
  }

  return { ok: true, file };
}
