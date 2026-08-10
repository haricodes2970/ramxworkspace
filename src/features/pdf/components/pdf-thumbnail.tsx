"use client";

import type { PDFPageProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

const THUMB_WIDTH = 132;
const MAX_DPR = 2;

type PdfThumbnailProps = {
  pageNumber: number;
  onSelect: (page: number) => void;
};

export function PdfThumbnail({ pageNumber, onSelect }: PdfThumbnailProps) {
  const doc = usePdfViewerStore((state) => state.doc);
  const currentPage = usePdfViewerStore((state) => state.currentPage);

  const containerRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [inView, setInView] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    doc.getPage(pageNumber).then((loadedPage) => {
      if (!cancelled) setPage(loadedPage);
    });
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
        } else {
          setInView(false);
          setRendered(false);
        }
      },
      { rootMargin: "200px 0px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!page || !inView || rendered) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const baseViewport = page.getViewport({ scale: 1 });
    const scale = THUMB_WIDTH / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const context = canvas.getContext("2d");
    if (!context) return;

    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;

    canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
    canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    const task = page.render({ canvasContext: context, viewport, canvas });
    renderTaskRef.current = task;
    task.promise
      .then(() => setRendered(true))
      .catch((error: unknown) => {
        if (
          !(error instanceof Error) ||
          error.name !== "RenderingCancelledException"
        ) {
          console.error(`Failed to render thumbnail ${pageNumber}`, error);
        }
      });
  }, [page, inView, rendered, pageNumber]);

  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, []);

  const isCurrent = pageNumber === currentPage;

  return (
    <button
      ref={containerRef}
      type="button"
      aria-label={`Go to page ${pageNumber}`}
      aria-current={isCurrent ? "page" : undefined}
      onClick={() => onSelect(pageNumber)}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-md border border-transparent p-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        isCurrent && "border-ring bg-ring/10",
      )}
    >
      <div className="flex min-h-10 items-center justify-center overflow-hidden rounded-sm shadow-sm">
        <canvas ref={canvasRef} className="block bg-white" />
        {!rendered && (
          <span className="px-2 py-4 text-xs text-muted-foreground">
            {pageNumber}
          </span>
        )}
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {pageNumber}
      </span>
    </button>
  );
}
