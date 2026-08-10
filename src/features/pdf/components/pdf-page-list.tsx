"use client";

import { useEffect, useRef } from "react";
import { PdfPage } from "@/features/pdf/components/pdf-page";
import {
  fitPdfToWidth,
  setPdfContainerWidthGetter,
} from "@/features/pdf/lib/pdf-layout";
import { setPdfScrollHandler } from "@/features/pdf/lib/pdf-scroll";
import { usePdfPagesStore } from "@/features/pdf/store/pdf-pages-store";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

export function PdfPageList() {
  const containerRef = useRef<HTMLDivElement>(null);
  const numPages = usePdfViewerStore((state) => state.numPages);
  const doc = usePdfViewerStore((state) => state.doc);
  const pages = usePdfPagesStore((state) => state.pages);
  const setCurrentPage = usePdfPagesStore((state) => state.setCurrentPage);
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

        if (mostVisible > 0) {
          const entry = pages[mostVisible - 1];
          if (entry) setCurrentPage(entry.id);
        }
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
  }, [numPages, doc, setScale, setCurrentPage, pages]);

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 flex-col overflow-auto bg-muted/30 p-4 sm:p-6"
    >
      {pages.map((entry, index) => (
        <PdfPage
          key={entry.id}
          pageId={entry.id}
          sourcePage={entry.sourcePage}
          displayIndex={index + 1}
          rotation={entry.rotation}
        />
      ))}
    </div>
  );
}
