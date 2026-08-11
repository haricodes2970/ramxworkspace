"use client";

import { Check, Download, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PdfExportBarStatus } from "@/features/pdf/types/pdf-export-ui";
import {
  buildExportedPdf,
  deriveExportFileName,
  sanitizeExportFileName,
  validateExportedPdf,
} from "@/features/pdf/lib/pdf-export";
import { useAnnotationStore } from "@/features/pdf/store/annotation-store";
import { usePdfPagesStore } from "@/features/pdf/store/pdf-pages-store";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";
import { useExportPermission } from "@/features/guest/use-export-permission";
import { useGuestExportStore } from "@/features/guest/guest-export-store";

const SUCCESS_DURATION_MS = 3000;

function triggerDownload(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function PdfExportBar() {
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState<PdfExportBarStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<number | null>(null);

  const close = usePdfViewerStore((state) => state.setExportOpen);
  const canExport = useExportPermission();
  const recordSuccessfulExport = useGuestExportStore(
    (state) => state.recordSuccessfulExport,
  );
  const openConversion = useGuestExportStore((state) => state.openConversion);

  useEffect(() => {
    const original = usePdfViewerStore.getState().fileName ?? "document.pdf";
    setFileName(deriveExportFileName(original));
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleExport = async () => {
    if (status === "exporting") return;
    if (!canExport) {
      openConversion();
      return;
    }
    const original = usePdfViewerStore.getState().fileName ?? "document.pdf";
    const finalName = sanitizeExportFileName(fileName, original);
    setFileName(finalName);
    setStatus("exporting");
    setMessage(null);

    try {
      const sourceBytes = usePdfViewerStore.getState().sourceBytes;
      const pages = usePdfPagesStore.getState().pages;
      const annotations = useAnnotationStore.getState().annotations;
      if (!sourceBytes || pages.length === 0) {
        throw new Error("The document is no longer available for export.");
      }
      const result = await buildExportedPdf(sourceBytes, pages, annotations);
      await validateExportedPdf(
        result.bytes,
        result.pageCount,
        result.rotations,
      );
      triggerDownload(result.bytes, finalName);
      recordSuccessfulExport();
      setStatus("success");
      setMessage(`Saved ${finalName}`);
      successTimerRef.current = window.setTimeout(() => {
        setStatus("idle");
        setMessage(null);
      }, SUCCESS_DURATION_MS);
    } catch (error) {
      console.error("Export failed", error);
      setStatus("error");
      setMessage(
        error instanceof Error && error.message
          ? error.message
          : "Export failed. Please try again.",
      );
    }
  };

  const handleCancel = () => {
    close(false);
  };

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Export PDF"
    >
      <Input
        ref={inputRef}
        type="text"
        value={fileName}
        aria-label="Export file name"
        onChange={(event) => setFileName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") void handleExport();
          if (event.key === "Escape") handleCancel();
        }}
        className="h-8 w-32 sm:w-56"
      />
      <Button
        type="button"
        size="sm"
        disabled={status === "exporting"}
        aria-label={status === "exporting" ? "Exporting PDF" : "Export PDF"}
        aria-busy={status === "exporting"}
        onClick={() => void handleExport()}
      >
        {status === "exporting" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : status === "success" ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Download className="size-4" aria-hidden="true" />
        )}
        {status === "exporting"
          ? "Exporting…"
          : status === "success"
            ? "Saved"
            : "Export"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Cancel export"
        disabled={status === "exporting"}
        onClick={handleCancel}
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
      {status === "error" && (
        <p role="alert" className="max-w-52 text-xs text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
