"use client";

import { useEffect, useRef } from "react";
import { FileText, Loader2, X } from "lucide-react";
import { loadPdfJs } from "@/features/pdf/lib/pdfjs";
import { PdfHiddenFileInput } from "@/features/pdf/components/pdf-hidden-file-input";
import { PdfPageList } from "@/features/pdf/components/pdf-page-list";
import { PdfThumbnails } from "@/features/pdf/components/pdf-thumbnails";
import { PdfToolbar } from "@/features/pdf/components/pdf-toolbar";
import { PdfUploader } from "@/features/pdf/components/pdf-uploader";
import { validatePdfFile } from "@/features/pdf/lib/pdf-validation";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";
import { usePdfPagesStore } from "@/features/pdf/store/pdf-pages-store";
import { createClient } from "@/lib/supabase/client";
import { markDocumentOpened } from "@/features/documents/document-service";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/storage";
import { Button } from "@/components/ui/button";

type PdfWorkspaceProps = {
  cloudDocumentId?: string | null;
};

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

function cloudErrorMessage(message: string | null): string {
  if (message === "missing") {
    return "This document is no longer available.";
  }
  if (message === "permission") {
    return "You don't have permission to access this document.";
  }
  return "The document could not be opened. Please try again.";
}

export function PdfWorkspace({ cloudDocumentId = null }: PdfWorkspaceProps) {
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
  const cloudLoadRef = useRef<AbortController | null>(null);

  const closeAll = () => {
    cloudLoadRef.current?.abort();
    closeDocument();
    clearPages();
  };

  useEffect(() => {
    if (!cloudDocumentId) return;

    const controller = new AbortController();
    cloudLoadRef.current = controller;

    const loadCloudDocument = async () => {
      const supabase = createClient();
      if (!supabase) {
        setError("Cloud storage is not configured yet.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("You need to sign in to open this document.");
        return;
      }

      setLoading();

      const { data: row, error: rowError } = await supabase
        .from("documents")
        .select("id, name, size_bytes, storage_path")
        .eq("id", cloudDocumentId)
        .maybeSingle();

      if (controller.signal.aborted) return;

      if (rowError || !row || !row.storage_path) {
        setError(cloudErrorMessage("missing"));
        return;
      }

      const { data: blob, error: downloadError } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .download(row.storage_path);

      if (controller.signal.aborted) return;

      if (downloadError || !blob) {
        setError(cloudErrorMessage(downloadError ? "permission" : "missing"));
        return;
      }

      try {
        const bytes = await blob.arrayBuffer();
        const { getDocument } = await loadPdfJs();
        const doc = await getDocument({ data: bytes }).promise;
        if (controller.signal.aborted) {
          void doc.destroy();
          return;
        }
        setReady(doc, row.name, row.size_bytes ?? bytes.byteLength, bytes);
        initPages(doc.numPages);
        void markDocumentOpened(supabase, row.id);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(pdfErrorMessage(caught));
        }
      }
    };

    void loadCloudDocument();
    return () => controller.abort();
  }, [cloudDocumentId, setError, setLoading, setReady, initPages]);

  const openPdf = async (file: File) => {
    setLoading();
    try {
      const data = await file.arrayBuffer();
      const { getDocument } = await loadPdfJs();
      const doc = await getDocument({ data }).promise;
      setReady(doc, file.name, file.size, data);
      initPages(doc.numPages);
    } catch (caught) {
      setError(pdfErrorMessage(caught));
    }
  };

  const openPicked = async (file: File) => {
    const result = validatePdfFile(file);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await openPdf(result.file);
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
      <PdfHiddenFileInput onFile={openPicked} />
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
