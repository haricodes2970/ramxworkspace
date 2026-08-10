"use client";

import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { PDFPageProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { PdfConfirmButton } from "@/features/pdf/components/pdf-confirm-button";
import { usePdfPagesStore } from "@/features/pdf/store/pdf-pages-store";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

const THUMB_WIDTH = 132;
const MAX_DPR = 2;

type PdfThumbnailProps = {
  pageId: string;
  sourcePage: number;
  displayIndex: number;
  rotation: number;
  onSelect: (page: number) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  deleteDisabled: boolean;
  dropBefore: boolean;
};

export function PdfThumbnail({
  pageId,
  sourcePage,
  displayIndex,
  rotation,
  onSelect,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  deleteDisabled,
  dropBefore,
}: PdfThumbnailProps) {
  const doc = usePdfViewerStore((state) => state.doc);
  const currentPageId = usePdfPagesStore((state) => state.currentPageId);
  const deletePage = usePdfPagesStore((state) => state.deletePage);

  const containerRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [inView, setInView] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    doc.getPage(sourcePage).then(
      (loadedPage) => {
        if (!cancelled) setPage(loadedPage);
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [doc, sourcePage]);

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

    const baseViewport = page.getViewport({ scale: 1, rotation });
    const scale = THUMB_WIDTH / baseViewport.width;
    const viewport = page.getViewport({ scale, rotation });
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
          console.error(`Failed to render thumbnail ${displayIndex}`, error);
        }
      });
  }, [page, inView, rendered, displayIndex, rotation]);

  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, []);

  const isCurrent = pageId === currentPageId;

  return (
    <div
      data-thumb-index
      data-thumb-id={pageId}
      className={cn(
        "relative flex flex-col items-center gap-1.5 rounded-md border border-transparent p-1.5 transition-colors",
        isCurrent && "border-ring bg-ring/10",
        dropBefore && "ring-2 ring-inset ring-ring",
      )}
    >
      <button
        ref={containerRef}
        type="button"
        aria-label={`Go to page ${displayIndex}`}
        aria-current={isCurrent ? "page" : undefined}
        onClick={() => onSelect(displayIndex)}
        className="flex flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex min-h-10 items-center justify-center overflow-hidden rounded-sm shadow-sm">
          <canvas ref={canvasRef} className="block bg-white" />
          {!rendered && (
            <span className="px-2 py-4 text-xs text-muted-foreground">
              {displayIndex}
            </span>
          )}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {displayIndex}
        </span>
      </button>
      <button
        type="button"
        data-drag-handle
        aria-label={`Reorder page ${displayIndex} (drag or use arrow keys)`}
        className="absolute left-1 top-1 flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        style={{ touchAction: "none" }}
      >
        <GripVertical className="size-3.5" aria-hidden="true" />
      </button>
      <PdfConfirmButton
        onConfirm={() => deletePage(pageId)}
        ariaLabel={`Delete page ${displayIndex}`}
        confirmAriaLabel={`Click again to confirm deleting page ${displayIndex}`}
        disabled={deleteDisabled}
        className="absolute right-1 top-1 size-6"
        confirmChildren={
          <span aria-hidden="true" className="text-xs font-bold">
            ✓
          </span>
        }
      >
        <span aria-hidden="true" className="text-xs font-bold">
          ✕
        </span>
      </PdfConfirmButton>
      <div className="absolute bottom-1 right-1 flex flex-col">
        <button
          type="button"
          aria-label={`Move page ${displayIndex} up`}
          disabled={!canMoveUp}
          onClick={onMoveUp}
          className="flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <ChevronUp className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Move page ${displayIndex} down`}
          disabled={!canMoveDown}
          onClick={onMoveDown}
          className="flex size-6 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <ChevronDown className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
