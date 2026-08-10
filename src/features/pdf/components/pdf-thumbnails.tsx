"use client";

import { useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { scrollToPdfPage } from "@/features/pdf/lib/pdf-scroll";
import { usePdfPagesStore } from "@/features/pdf/store/pdf-pages-store";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";
import { PdfThumbnail } from "@/features/pdf/components/pdf-thumbnail";

type DragState = {
  pageId: string;
  handle: HTMLElement;
};

function ThumbnailGrid({ onSelect }: { onSelect: (page: number) => void }) {
  const pages = usePdfPagesStore((state) => state.pages);
  const movePage = usePdfPagesStore((state) => state.movePage);
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const selectPage = (page: number) => {
    scrollToPdfPage(page);
    onSelect(page);
  };

  const commitDrop = (clientY: number, draggedId: string) => {
    const items = Array.from(gridRef.current?.children ?? []).filter(
      (element) => element.hasAttribute("data-thumb-index"),
    );
    const draggedIndex = items.findIndex(
      (element) => element.getAttribute("data-thumb-id") === draggedId,
    );
    for (let i = 0; i < items.length; i += 1) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        movePage(draggedId, i);
        return;
      }
    }
    const fallback = draggedIndex === -1 ? items.length : items.length - 1;
    movePage(draggedId, fallback);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const handle = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-drag-handle]",
    );
    const thumb = handle?.closest<HTMLElement>("[data-thumb-id]");
    const pageId = thumb?.getAttribute("data-thumb-id");
    if (!handle || !pageId) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    setDrag({ pageId, handle });
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const items = Array.from(gridRef.current?.children ?? []).filter(
      (element) => element.hasAttribute("data-thumb-index"),
    );
    for (let i = 0; i < items.length; i += 1) {
      const rect = items[i].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        setDropIndex(i);
        return;
      }
    }
    setDropIndex(items.length - 1);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    try {
      drag.handle.releasePointerCapture(event.pointerId);
    } catch {
      // capture may already be released
    }
    commitDrop(event.clientY, drag.pageId);
    setDrag(null);
    setDropIndex(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    const thumb = (event.target as Element | null)?.closest<HTMLElement>(
      "[data-thumb-id]",
    );
    const pageId = thumb?.getAttribute("data-thumb-id");
    if (!pageId) return;
    const index = pages.findIndex((entry) => entry.id === pageId);
    if (index === -1) return;
    const nextIndex = event.key === "ArrowUp" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= pages.length) return;
    event.preventDefault();
    movePage(pageId, nextIndex);
  };

  return (
    <div
      ref={gridRef}
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto p-2"
      role="navigation"
      aria-label="Page thumbnails"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      {pages.map((entry, index) => (
        <PdfThumbnail
          key={entry.id}
          pageId={entry.id}
          sourcePage={entry.sourcePage}
          displayIndex={index + 1}
          rotation={entry.rotation}
          onSelect={selectPage}
          onMoveUp={() => movePage(entry.id, index - 1)}
          onMoveDown={() => movePage(entry.id, index + 1)}
          canMoveUp={index > 0}
          canMoveDown={index < pages.length - 1}
          dropBefore={dropIndex === index && drag?.pageId !== entry.id}
        />
      ))}
    </div>
  );
}

export function PdfThumbnails() {
  const thumbnailsOpen = usePdfViewerStore((state) => state.thumbnailsOpen);
  const mobileThumbsOpen = usePdfViewerStore((state) => state.mobileThumbsOpen);
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
