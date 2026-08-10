"use client";

import {
  ChevronLeft,
  ChevronRight,
  Maximize,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Search,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PdfSearchBar } from "@/features/pdf/components/pdf-search-bar";
import { getPdfContainerWidth } from "@/features/pdf/lib/pdf-layout";
import { scrollToPdfPage } from "@/features/pdf/lib/pdf-scroll";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

export function PdfToolbar() {
  const currentPage = usePdfViewerStore((state) => state.currentPage);
  const numPages = usePdfViewerStore((state) => state.numPages);
  const scale = usePdfViewerStore((state) => state.scale);
  const doc = usePdfViewerStore((state) => state.doc);
  const thumbnailsOpen = usePdfViewerStore((state) => state.thumbnailsOpen);
  const toggleThumbnails = usePdfViewerStore(
    (state) => state.toggleThumbnails,
  );
  const zoomIn = usePdfViewerStore((state) => state.zoomIn);
  const zoomOut = usePdfViewerStore((state) => state.zoomOut);
  const resetZoom = usePdfViewerStore((state) => state.resetZoom);
  const setScale = usePdfViewerStore((state) => state.setScale);
  const setMobileThumbsOpen = usePdfViewerStore(
    (state) => state.setMobileThumbsOpen,
  );
  const searchOpen = usePdfViewerStore((state) => state.searchOpen);
  const setSearchOpen = usePdfViewerStore((state) => state.setSearchOpen);

  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSearchOpen]);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const goToPage = (page: number) => {
    scrollToPdfPage(page);
  };

  const commitPageInput = () => {
    const parsed = Number(pageInput);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > numPages) {
      setPageInput(String(currentPage));
      return;
    }
    goToPage(parsed);
  };

  const atFirst = currentPage <= 1;
  const atLast = currentPage >= numPages;

  const fitToWidth = async () => {
    if (!doc) return;
    const firstPage = await doc.getPage(1);
    const pageWidth = firstPage.getViewport({ scale: 1 }).width;
    const containerWidth = getPdfContainerWidth();
    const fitted = (containerWidth - 48) / pageWidth;
    setScale(fitted);
  };

  const toggleThumbnailPanel = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      toggleThumbnails();
    } else {
      setMobileThumbsOpen(true);
    }
  };

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 sm:px-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={thumbnailsOpen ? "Hide thumbnails" : "Show thumbnails"}
            aria-pressed={thumbnailsOpen}
            onClick={toggleThumbnailPanel}
          >
            {thumbnailsOpen ? (
              <PanelLeftClose className="size-5" aria-hidden="true" />
            ) : (
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {thumbnailsOpen ? "Hide thumbnails" : "Show thumbnails"}
        </TooltipContent>
      </Tooltip>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Previous page"
              disabled={atFirst}
              onClick={() => goToPage(currentPage - 1)}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous page</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-1" role="group" aria-label="Page navigation">
          <Input
            type="number"
            min={1}
            max={numPages}
            value={pageInput}
            aria-label="Current page number"
            className="h-8 w-16 px-2 text-center tabular-nums"
            onChange={(event) => setPageInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitPageInput();
            }}
            onBlur={commitPageInput}
          />
          <span className="px-1 text-sm tabular-nums text-muted-foreground">
            / {numPages}
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Next page"
              disabled={atLast}
              onClick={() => goToPage(currentPage + 1)}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next page</TooltipContent>
        </Tooltip>
      </div>

      <div
        className="ml-auto flex items-center gap-1"
        role="group"
        aria-label="Zoom controls"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fit to width"
              onClick={fitToWidth}
            >
              <Maximize className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to width</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Zoom out"
              onClick={zoomOut}
            >
              <ZoomOut className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Reset zoom to 100 percent"
              onClick={resetZoom}
              className="w-14 tabular-nums"
            >
              {Math.round(scale * 100)}%
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset zoom</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Zoom in"
              onClick={zoomIn}
            >
              <ZoomIn className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Reset zoom"
              onClick={resetZoom}
            >
              <RotateCcw className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset zoom to 100%</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1">
        {searchOpen ? (
          <PdfSearchBar />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Search in PDF"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="size-5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Search (Ctrl+F)</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
