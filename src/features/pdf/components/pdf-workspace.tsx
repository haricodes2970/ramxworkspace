"use client";

import { FileText, Loader2, X } from "lucide-react";
import { loadPdfJs } from "@/features/pdf/lib/pdfjs";
import { PdfPageList } from "@/features/pdf/components/pdf-page-list";
import { PdfThumbnails } from "@/features/pdf/components/pdf-thumbnails";
import { PdfToolbar } from "@/features/pdf/components/pdf-toolbar";
import { PdfUploader } from "@/features/pdf/components/pdf-uploader";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";
import { usePdfPagesStore } from "@/features/pdf/store/pdf-pages-store";
import { Button } from "@/components/ui/button";

function pdfErrorMessage(error: unknown): string {
  const name = error instanceof Error ? error.name : undefined;
  if (name === "PasswordException") {
    return "This PDF is password protected. Open it in a PDF app first and try again.";
  }
  if (name === "InvalidPDFException") {
    return "This file is not a valid PDF. Choose a different file.";
  }
  if (name === "MissingPDFException") {
    return "The PDF could not be read. The file may be corrupted.";
  }
  return "Something went wrong while opening the PDF. Try a different file.";
}

export function PdfWorkspace() {
  const status = usePdfViewerStore((state) => state.status);
  const error = usePdfViewerStore((state) => state.error);
  const fileName = usePdfViewerStore((state) => state.fileName);
  const numPages = usePdfViewerStore((state) => state.numPages);
  const setLoading = usePdfViewerStore((state) => state.setLoading);
  const setReady = usePdfViewerStore((state) => state.setReady);
  const setError = usePdfViewerStore((state) => state.setError);
  const closeDocument = usePdfViewerStore((state) => state.closeDocument);
  const initPages = usePdfPagesStore((state) => state.initPages);
  const clearPages = usePdfPagesStore((state) => state.clearPages);

  const closeAll = () => {
    closeDocument();
    clearPages();
  };

  const openPdf = async (file: File) => {
    setLoading();
    try {
      const data = await file.arrayBuffer();
      const { getDocument } = await loadPdfJs();
      const doc = await getDocument({ data }).promise;
      setReady(doc, file.name, file.size);
      initPages(doc.numPages);
    } catch (caught) {
      setError(pdfErrorMessage(caught));
    }
  };

  if (status === "idle") {
    return <PdfUploader onFile={openPdf} />;
  }

  if (status === "loading") {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2
            className="size-6 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">Opening PDF…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full min-h-0 flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-background px-6 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted">
              <FileText
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <h2 className="text-lg font-semibold">Could not open PDF</h2>
            <p className="text-sm leading-6 text-muted-foreground">{error}</p>
            <Button type="button" onClick={closeAll} className="mt-2">
              Choose another file
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold">{fileName}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {numPages} page{numPages === 1 ? "" : "s"}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={closeAll}>
          <X className="size-4" aria-hidden="true" />
          Close PDF
        </Button>
      </div>
      <PdfToolbar />
      <div className="flex min-h-0 flex-1">
        <PdfThumbnails />
        <PdfPageList />
      </div>
    </div>
  );
}
