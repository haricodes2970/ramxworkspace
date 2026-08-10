"use client";

import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { scrollToPdfPage } from "@/features/pdf/lib/pdf-scroll";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

export function PdfToolbar() {
  const currentPage = usePdfViewerStore((state) => state.currentPage);
  const numPages = usePdfViewerStore((state) => state.numPages);
  const thumbnailsOpen = usePdfViewerStore((state) => state.thumbnailsOpen);
  const toggleThumbnails = usePdfViewerStore(
    (state) => state.toggleThumbnails,
  );

  const [pageInput, setPageInput] = useState(String(currentPage));

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
            onClick={toggleThumbnails}
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
    </div>
  );
}
