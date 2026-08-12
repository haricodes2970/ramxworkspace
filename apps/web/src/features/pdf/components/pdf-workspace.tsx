"use client";

import { useEffect, useRef, useState } from "react";
import { CloudUpload, FileText, Loader2, X } from "lucide-react";
import { loadPdfJs } from "@/features/pdf/lib/pdfjs";
import { PdfHiddenFileInput } from "@/features/pdf/components/pdf-hidden-file-input";
import { PdfPageList } from "@/features/pdf/components/pdf-page-list";
import { PdfThumbnails } from "@/features/pdf/components/pdf-thumbnails";
import { PdfToolbar } from "@/features/pdf/components/pdf-toolbar";
import { PdfUploader } from "@/features/pdf/components/pdf-uploader";
import { validatePdfFile } from "@/features/pdf/lib/pdf-validation";
import { runCloudSave } from "@/features/pdf/lib/cloud-save";
import { UnsavedChangesDialog } from "@/features/pdf/components/unsaved-changes-dialog";
import { StaleSaveDialog } from "@/features/pdf/components/stale-save-dialog";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";
import { usePdfPagesStore } from "@/features/pdf/store/pdf-pages-store";
import { useAnnotationStore } from "@/features/pdf/store/annotation-store";
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

function snapshotKey(): string {
  return JSON.stringify({
    pages: usePdfPagesStore.getState().pages,
    annotations: useAnnotationStore.getState().annotations,
  });
}

type SaveDialog =
  | { kind: "unsaved"; pendingHref: string | null }
  | { kind: "stale"; pendingHref: string | null };

export function PdfWorkspace({ cloudDocumentId = null }: PdfWorkspaceProps) {
  const status = usePdfViewerStore((state) => state.status);
  const error = usePdfViewerStore((state) => state.error);
  const fileName = usePdfViewerStore((state) => state.fileName);
  const numPages = usePdfViewerStore((state) => state.numPages);
  const source = usePdfViewerStore((state) => state.source);
  const dirty = usePdfViewerStore((state) => state.dirty);
  const saving = usePdfViewerStore((state) => state.saving);
  const saveFeedback = usePdfViewerStore((state) => state.saveFeedback);
  const saveError = usePdfViewerStore((state) => state.saveError);
  const setLoading = usePdfViewerStore((state) => state.setLoading);
  const setReady = usePdfViewerStore((state) => state.setReady);
  const setError = usePdfViewerStore((state) => state.setError);
  const setCloudContext = usePdfViewerStore((state) => state.setCloudContext);
  const closeDocument = usePdfViewerStore((state) => state.closeDocument);
  const initPages = usePdfPagesStore((state) => state.initPages);
  const clearPages = usePdfPagesStore((state) => state.clearPages);
  const cloudLoadRef = useRef<AbortController | null>(null);
  const baselineRef = useRef<string | null>(null);
  const [dialog, setDialog] = useState<SaveDialog | null>(null);

  const refreshBaseline = () => {
    baselineRef.current = snapshotKey();
  };

  const closeAll = () => {
    cloudLoadRef.current?.abort();
    baselineRef.current = null;
    closeDocument();
    clearPages();
  };

  const requestClose = () => {
    const state = usePdfViewerStore.getState();
    if (state.source === "cloud" && state.dirty) {
      setDialog({ kind: "unsaved", pendingHref: null });
      return;
    }
    closeAll();
  };

  const handleSave = async (
    force: boolean,
  ): Promise<"ok" | "stale" | "error"> => {
    const outcome = await runCloudSave(force);
    if (outcome === "ok") {
      refreshBaseline();
      setDialog((current) => {
        if (current?.pendingHref) {
          window.setTimeout(() => {
            window.location.assign(current.pendingHref ?? "");
          }, 0);
          return null;
        }
        return null;
      });
    }
    return outcome;
  };

  const handleDialogSave = async () => {
    const outcome = await handleSave(false);
    if (outcome === "stale") {
      setDialog((current) => ({
        kind: "stale",
        pendingHref: current?.pendingHref ?? null,
      }));
      return;
    }
    if (outcome === "error") {
      setDialog(null);
      return;
    }
    const current = dialog;
    if (current?.kind === "unsaved" && !current.pendingHref) {
      closeAll();
    }
  };

  const handleDiscard = () => {
    const pendingHref = dialog?.pendingHref ?? null;
    setDialog(null);
    closeAll();
    if (pendingHref) {
      window.location.assign(pendingHref);
    }
  };

  const handleSaveAnyway = async () => {
    const outcome = await handleSave(true);
    if (outcome === "ok" && dialog?.kind === "stale") {
      setDialog(null);
    }
    if (outcome === "error") {
      setDialog(null);
    }
  };

  useEffect(() => {
    if (!cloudDocumentId) {
      baselineRef.current = null;
      return;
    }

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
        .select("id, name, size_bytes, storage_path, updated_at")
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
        setCloudContext(row.id, row.updated_at);
        refreshBaseline();
        void markDocumentOpened(supabase, row.id);
      } catch (caught) {
        if (!controller.signal.aborted) {
          setError(pdfErrorMessage(caught));
        }
      }
    };

    void loadCloudDocument();
    return () => controller.abort();
  }, [
    cloudDocumentId,
    setError,
    setLoading,
    setReady,
    initPages,
    setCloudContext,
  ]);

  useEffect(() => {
    if (!cloudDocumentId) return;
    const checkDirty = () => {
      if (baselineRef.current === null) return;
      const state = usePdfViewerStore.getState();
      if (
        state.status !== "ready" ||
        state.source !== "cloud" ||
        state.saving
      ) {
        return;
      }
      if (snapshotKey() !== baselineRef.current) {
        state.markDirty();
      }
    };
    const unsubscribeAnnotations = useAnnotationStore.subscribe(checkDirty);
    const unsubscribePages = usePdfPagesStore.subscribe(checkDirty);
    return () => {
      unsubscribeAnnotations();
      unsubscribePages();
    };
  }, [cloudDocumentId]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      const state = usePdfViewerStore.getState();
      if (state.source === "cloud" && state.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const state = usePdfViewerStore.getState();
      if (state.source !== "cloud" || !state.dirty) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("/workspace")) return;
      event.preventDefault();
      event.stopPropagation();
      setDialog({ kind: "unsaved", pendingHref: href });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    const handler = () => {
      void handleSave(false);
    };
    window.addEventListener("ramspace-save", handler);
    return () => window.removeEventListener("ramspace-save", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  let content;
  if (status === "idle") {
    content = <PdfUploader onFile={openPdf} />;
  } else if (status === "loading") {
    content = (
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
  } else if (status === "error") {
    content = (
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
  } else {
    content = (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <PdfHiddenFileInput onFile={openPicked} />
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-background px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{fileName}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {numPages} page{numPages === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {source === "cloud" && (
              <>
                <span
                  className="text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  {dirty ? "Unsaved changes" : "Saved"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={saving || !dirty}
                  aria-label={
                    saving ? "Saving document" : "Save document to cloud"
                  }
                  aria-busy={saving}
                  onClick={() => void handleSave(false)}
                >
                  {saving ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <CloudUpload className="size-4" aria-hidden="true" />
                  )}
                  {saving ? "Saving…" : "Save"}
                </Button>
                {saveFeedback === "error" && saveError && (
                  <span
                    role="alert"
                    className="max-w-56 text-xs text-destructive"
                  >
                    {saveError}
                  </span>
                )}
              </>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={requestClose}
              disabled={saving}
            >
              <X className="size-4" aria-hidden="true" />
              Close PDF
            </Button>
          </div>
        </div>
        <PdfToolbar />
        <div className="flex min-h-0 flex-1">
          <PdfThumbnails />
          <PdfPageList />
        </div>
      </div>
    );
  }

  return (
    <>
      {content}
      <UnsavedChangesDialog
        open={dialog?.kind === "unsaved"}
        saving={saving}
        onSave={() => void handleDialogSave()}
        onDiscard={handleDiscard}
        onCancel={() => setDialog(null)}
      />
      <StaleSaveDialog
        open={dialog?.kind === "stale"}
        saving={saving}
        onSaveAnyway={() => void handleSaveAnyway()}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
