"use client";

import type { PDFPageProxy } from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

const MAX_DPR = 2;

type PdfPageProps = {
  pageNumber: number;
};

export function PdfPage({ pageNumber }: PdfPageProps) {
  const doc = usePdfViewerStore((state) => state.doc);
  const scale = usePdfViewerStore((state) => state.scale);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const renderVersionRef = useRef(0);

  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [inView, setInView] = useState(false);
  const [rendered, setRendered] = useState(false);
  const renderedScaleRef = useRef(0);

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
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            setRendered(false);
          } else {
            setInView(false);
            renderedScaleRef.current = 0;
          }
        }
      },
      { rootMargin: "300px 0px" },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const renderPage = useCallback(async () => {
    const target = page;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!target || !canvas || !container) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const viewport = target.getViewport({ scale });
    const context = canvas.getContext("2d");
    if (!context) return;

    const version = ++renderVersionRef.current;
    renderTaskRef.current?.cancel();
    renderTaskRef.current = null;

    canvas.width = Math.max(1, Math.floor(viewport.width * dpr));
    canvas.height = Math.max(1, Math.floor(viewport.height * dpr));
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    container.style.width = `${viewport.width}px`;

    try {
      const task = target.render({
        canvasContext: context,
        viewport,
        canvas,
      });
      renderTaskRef.current = task;
      await task.promise;
      if (version === renderVersionRef.current) {
        renderedScaleRef.current = scale;
        setRendered(true);
      }
    } catch (error) {
      if (
        !(error instanceof Error) ||
        error.name !== "RenderingCancelledException"
      ) {
        console.error(`Failed to render page ${pageNumber}`, error);
      }
    }
  }, [page, scale, pageNumber]);

  useEffect(() => {
    if (!page || !inView) return;
    if (renderedScaleRef.current === scale) return;
    void renderPage();
  }, [page, inView, scale, renderPage]);

  useEffect(() => {
    return () => {
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-page={pageNumber}
      className="relative mx-auto my-2 shadow-lg ring-1 ring-border"
    >
      <canvas ref={canvasRef} className="block bg-white" />
      {!rendered && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted"
          aria-hidden="true"
        >
          <span className="text-xs text-muted-foreground">
            Page {pageNumber}
          </span>
        </div>
      )}
    </div>
  );
}
