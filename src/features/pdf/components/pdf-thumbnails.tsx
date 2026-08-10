"use client";

import { useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { scrollToPdfPage } from "@/features/pdf/lib/pdf-scroll";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";
import { PdfThumbnail } from "@/features/pdf/components/pdf-thumbnail";

function ThumbnailGrid({ onSelect }: { onSelect: (page: number) => void }) {
  const numPages = usePdfViewerStore((state) => state.numPages);

  const selectPage = (page: number) => {
    scrollToPdfPage(page);
    onSelect(page);
  };

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2"
      role="navigation"
      aria-label="Page thumbnails"
    >
      {Array.from({ length: numPages }, (_, index) => (
        <PdfThumbnail
          key={index + 1}
          pageNumber={index + 1}
          onSelect={selectPage}
        />
      ))}
    </div>
  );
}

export function PdfThumbnails() {
  const thumbnailsOpen = usePdfViewerStore((state) => state.thumbnailsOpen);
  const mobileThumbsOpen = usePdfViewerStore(
    (state) => state.mobileThumbsOpen,
  );
  const setMobileThumbsOpen = usePdfViewerStore(
    (state) => state.setMobileThumbsOpen,
  );

  return (
    <>
      {thumbnailsOpen && (
        <aside className="hidden w-48 shrink-0 flex-col border-r border-border bg-background md:flex">
          <ThumbnailGrid onSelect={() => undefined} />
        </aside>
      )}

      <Sheet open={mobileThumbsOpen} onOpenChange={setMobileThumbsOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Thumbnails</SheetTitle>
            <SheetDescription>Page thumbnails</SheetDescription>
          </SheetHeader>
          <ThumbnailGrid onSelect={() => setMobileThumbsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
