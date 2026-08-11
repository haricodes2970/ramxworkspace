"use client";

type PdfJsModule = typeof import("pdfjs-dist");

let workerConfigured = false;

export async function loadPdfJs(): Promise<PdfJsModule> {
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerConfigured = true;
  }
  return pdfjs;
}
