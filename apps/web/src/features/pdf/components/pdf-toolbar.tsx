"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  RotateCw,
  Search,
  Trash2,
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
import { PdfExportBar } from "@/features/pdf/components/pdf-export-bar";
import { PdfConfirmButton } from "@/features/pdf/components/pdf-confirm-button";
import { PdfToolsGroup } from "@/features/pdf/components/pdf-tools-group";
import { fitPdfToWidth } from "@/features/pdf/lib/pdf-layout";
import { openPdfFile } from "@/features/pdf/lib/pdf-open";
import type { AnnotationTool } from "@/features/pdf/types/annotation";
import { useAnnotationStore } from "@/features/pdf/store/annotation-store";
import { usePdfPagesStore } from "@/features/pdf/store/pdf-pages-store";
import { scrollToPdfPage } from "@/features/pdf/lib/pdf-scroll";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

export function PdfToolbar() {
  const currentPage = usePdfViewerStore((state) => state.currentPage);
  const numPages = usePdfViewerStore((state) => state.numPages);
  const scale = usePdfViewerStore((state) => state.scale);
  const doc = usePdfViewerStore((state) => state.doc);
  const thumbnailsOpen = usePdfViewerStore((state) => state.thumbnailsOpen);
  const toggleThumbnails = usePdfViewerStore((state) => state.toggleThumbnails);
  const zoomIn = usePdfViewerStore((state) => state.zoomIn);
  const zoomOut = usePdfViewerStore((state) => state.zoomOut);
  const resetZoom = usePdfViewerStore((state) => state.resetZoom);
  const setScale = usePdfViewerStore((state) => state.setScale);
  const setMobileThumbsOpen = usePdfViewerStore(
    (state) => state.setMobileThumbsOpen,
  );
  const searchOpen = usePdfViewerStore((state) => state.searchOpen);
  const setSearchOpen = usePdfViewerStore((state) => state.setSearchOpen);
  const exportOpen = usePdfViewerStore((state) => state.exportOpen);
  const setExportOpen = usePdfViewerStore((state) => state.setExportOpen);
  const undo = useAnnotationStore((state) => state.undo);
  const redo = useAnnotationStore((state) => state.redo);
  const selectedId = useAnnotationStore((state) => state.selectedId);
  const deleteAnnotation = useAnnotationStore(
    (state) => state.deleteAnnotation,
  );
  const activeTool = useAnnotationStore((state) => state.activeTool);
  const setTool = useAnnotationStore((state) => state.setTool);
  const clearSelection = useAnnotationStore((state) => state.clearSelection);
  const currentPageId = usePdfPagesStore((state) => state.currentPageId);
  const rotatePage = usePdfPagesStore((state) => state.rotatePage);
  const deletePage = usePdfPagesStore((state) => state.deletePage);

  const [pageInput, setPageInput] = useState(String(currentPage));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const inEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      const ctrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (ctrl && key === "o") {
        event.preventDefault();
        openPdfFile();
        return;
      }

      if (ctrl && key === "f") {
        event.preventDefault();
        if (searchOpen) {
          document.getElementById("pdf-search-input")?.focus();
        } else {
          setSearchOpen(true);
        }
        return;
      }

      if (ctrl && key === "s") {
        event.preventDefault();
        if (usePdfViewerStore.getState().source === "cloud") {
          window.dispatchEvent(new Event("ramspace-save"));
          return;
        }
        if (doc) setExportOpen(true);
        return;
      }

      if (ctrl && (key === "+" || key === "=")) {
        event.preventDefault();
        zoomIn();
        return;
      }

      if (ctrl && (key === "-" || key === "_")) {
        event.preventDefault();
        zoomOut();
        return;
      }

      if (ctrl && key === "0") {
        event.preventDefault();
        resetZoom();
        return;
      }

      if (inEditable) return;

      if (ctrl && key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }

      if (ctrl && key === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedId) {
          event.preventDefault();
          deleteAnnotation(selectedId);
        }
        return;
      }

      if (event.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
        } else if (exportOpen) {
          setExportOpen(false);
        } else if (activeTool !== "select") {
          setTool("select");
        } else {
          clearSelection();
        }
        return;
      }

      if (!ctrl && !event.altKey && !event.metaKey) {
        const toolByKey: Record<string, AnnotationTool> = {
          h: "highlight",
          u: "underline",
          d: "pen",
          t: "text",
          n: "note",
        };
        const tool = toolByKey[key];
        if (tool) setTool(tool);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    setSearchOpen,
    setExportOpen,
    doc,
    zoomIn,
    zoomOut,
    resetZoom,
    undo,
    redo,
    selectedId,
    deleteAnnotation,
    clearSelection,
    setTool,
    activeTool,
    searchOpen,
    exportOpen,
  ]);

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

  const fitToWidth = () => {
    if (!doc) return;
    void fitPdfToWidth(doc, setScale);
  };

  const toggleThumbnailPanel = () => {
    if (window.matchMedia("(min-width: 768px)").matches) {
      toggleThumbnails();
    } else {
      setMobileThumbsOpen(true);
    }
  };

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 sm:px-4"
      aria-keyshortcuts="Control+o Control+f Control+s Control+z Control+y Control+Shift+z Control+plus Control+minus Control+0 h u d t n Escape"
    >
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

        <div
          className="flex items-center gap-1"
          role="group"
          aria-label="Page navigation"
        >
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Rotate page counter-clockwise"
              disabled={!currentPageId}
              onClick={() => {
                if (currentPageId) rotatePage(currentPageId, "ccw");
              }}
            >
              <RotateCcw className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rotate counter-clockwise</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Rotate page clockwise"
              disabled={!currentPageId}
              onClick={() => {
                if (currentPageId) rotatePage(currentPageId, "cw");
              }}
            >
              <RotateCw className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Rotate clockwise</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <PdfConfirmButton
              onConfirm={() => {
                if (currentPageId) deletePage(currentPageId);
              }}
              ariaLabel={`Delete page ${currentPage}`}
              confirmAriaLabel="Click again to confirm page deletion"
              disabled={!currentPageId || numPages <= 1}
              className="size-9"
              confirmChildren={
                <span className="text-xs font-medium">Confirm?</span>
              }
            >
              <Trash2 className="size-5" aria-hidden="true" />
            </PdfConfirmButton>
          </TooltipTrigger>
          <TooltipContent>
            {numPages <= 1
              ? "Cannot delete the only page"
              : "Delete current page"}
          </TooltipContent>
        </Tooltip>
      </div>

      <PdfToolsGroup />

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
              aria-keyshortcuts="Control+-"
              onClick={zoomOut}
            >
              <ZoomOut className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom out (Ctrl+-)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Reset zoom to 100 percent"
              aria-keyshortcuts="Control+0"
              onClick={resetZoom}
              className="w-14 tabular-nums"
            >
              {Math.round(scale * 100)}%
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset zoom (Ctrl+0)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Zoom in"
              aria-keyshortcuts="Control+plus"
              onClick={zoomIn}
            >
              <ZoomIn className="size-5" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom in (Ctrl++)</TooltipContent>
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
        {exportOpen ? (
          <PdfExportBar />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Export PDF"
                aria-keyshortcuts="Control+s"
                onClick={() => setExportOpen(true)}
              >
                <Download className="size-5" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export PDF (Ctrl+S)</TooltipContent>
          </Tooltip>
        )}
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
