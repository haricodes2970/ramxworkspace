"use client";

import { useEffect, useRef } from "react";
import { PdfPage } from "@/features/pdf/components/pdf-page";
import {
  fitPdfToWidth,
  setPdfContainerWidthGetter,
} from "@/features/pdf/lib/pdf-layout";
import { setPdfScrollHandler } from "@/features/pdf/lib/pdf-scroll";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

export function PdfPageList() {
  const containerRef = useRef<HTMLDivElement>(null);
  const numPages = usePdfViewerStore((state) => state.numPages);
  const doc = usePdfViewerStore((state) => state.doc);
  const setCurrentPage = usePdfViewerStore((state) => state.setCurrentPage);
  const setScale = usePdfViewerStore((state) => state.setScale);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setPdfContainerWidthGetter(() => container.clientWidth);

    if (doc && container.clientWidth < 640) {
      void fitPdfToWidth(doc, setScale);
    }

    const ratios = new Map<number, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        let mostVisible = -1;
        let bestRatio = 0;

        for (const entry of entries) {
          const pageNumber = Number((entry.target as HTMLElement).dataset.page);
          const ratio = entry.isIntersecting ? entry.intersectionRatio : 0;
          ratios.set(pageNumber, ratio);
        }

        for (const [pageNumber, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            mostVisible = pageNumber;
          }
        }

        if (mostVisible > 0) setCurrentPage(mostVisible);
      },
      { root: container, threshold: [0, 0.1, 0.5, 0.9] },
    );

    container.querySelectorAll<HTMLElement>("[data-page]").forEach((node) => {
      observer.observe(node);
    });

    setPdfScrollHandler((page, behavior) => {
      const target = container.querySelector<HTMLElement>(
        `[data-page="${page}"]`,
      );
      target?.scrollIntoView({ behavior, block: "start" });
    });

    return () => {
      observer.disconnect();
      setPdfScrollHandler(null);
      setPdfContainerWidthGetter(null);
    };
  }, [numPages, doc, setScale, setCurrentPage]);

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 p-4 sm:p-6"
    >
      {Array.from({ length: numPages }, (_, index) => (
        <PdfPage key={index + 1} pageNumber={index + 1} />
      ))}
    </div>
  );
}
