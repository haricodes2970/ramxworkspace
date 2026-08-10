"use client";

import type { PDFPageProxy } from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PdfAnnotationOverlay } from "@/features/pdf/components/pdf-annotation-overlay";
import { getPageTextItems } from "@/features/pdf/lib/pdf-search";
import {
  renderPdfTextLayer,
  type PdfTextItem,
} from "@/features/pdf/lib/pdf-text-layer";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

const MAX_DPR = 2;

type PdfPageProps = {
  pageNumber: number;
};

export function PdfPage({ pageNumber }: PdfPageProps) {
  const doc = usePdfViewerStore((state) => state.doc);
  const scale = usePdfViewerStore((state) => state.scale);
  const searchMatches = usePdfViewerStore((state) => state.searchMatches);
  const searchResultIndex = usePdfViewerStore(
    (state) => state.searchResultIndex,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const renderVersionRef = useRef(0);

  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [textItems, setTextItems] = useState<PdfTextItem[]>([]);
  const [inView, setInView] = useState(false);
  const [rendered, setRendered] = useState(false);
  const renderedScaleRef = useRef(0);

  const pageMatches = useMemo(
    () =>
      searchMatches
        .filter((match) => match.page === pageNumber)
        .map((match) => ({
          itemIndex: match.itemIndex,
          start: match.start,
          end: match.end,
          current:
            searchResultIndex >= 0 &&
            searchMatches[searchResultIndex] === match,
        })),
    [searchMatches, searchResultIndex, pageNumber],
  );

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    doc.getPage(pageNumber).then(
      (loadedPage) => {
        if (!cancelled) setPage(loadedPage);
      },
      () => undefined,
    );
    getPageTextItems(doc, pageNumber)
      .then((items) => {
        if (!cancelled) setTextItems(items);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          console.error(`Failed to extract text for page ${pageNumber}`, error);
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
    const layer = textLayerRef.current;
    if (!layer || !page || textItems.length === 0) return;
    const viewport = page.getViewport({ scale });
    renderPdfTextLayer({
      container: layer,
      items: textItems,
      viewport,
      matches: pageMatches,
    });

    if (pageMatches.some((match) => match.current)) {
      layer.querySelector<HTMLElement>(".pdf-match-current")?.scrollIntoView({
        block: "center",
      });
    }
  }, [page, textItems, scale, pageMatches]);

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
      <div ref={textLayerRef} className="pdf-text-layer" aria-hidden="true" />
      <PdfAnnotationOverlay pageNumber={pageNumber} />
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
