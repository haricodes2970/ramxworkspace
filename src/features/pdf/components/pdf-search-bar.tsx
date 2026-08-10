"use client";

import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

export function PdfSearchBar() {
  const searchQuery = usePdfViewerStore((state) => state.searchQuery);
  const searchMatches = usePdfViewerStore((state) => state.searchMatches);
  const searchResultIndex = usePdfViewerStore(
    (state) => state.searchResultIndex,
  );
  const runSearch = usePdfViewerStore((state) => state.runSearch);
  const nextMatch = usePdfViewerStore((state) => state.nextMatch);
  const prevMatch = usePdfViewerStore((state) => state.prevMatch);
  const clearSearch = usePdfViewerStore((state) => state.clearSearch);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(value);
    }, 250);
  };

  const matchCount = searchMatches.length;
  const currentNumber =
    matchCount > 0 && searchResultIndex >= 0 ? searchResultIndex + 1 : 0;

  return (
    <div
      className="flex items-center gap-1"
      role="search"
      aria-label="Search in PDF"
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Input
        ref={inputRef}
        type="text"
        defaultValue={searchQuery}
        placeholder="Search in PDF"
        aria-label="Search in PDF"
        className="h-8 w-36 sm:w-52"
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (event.shiftKey) prevMatch();
            else nextMatch();
          }
        }}
      />
      <span className="min-w-10 px-1 text-center text-sm tabular-nums text-muted-foreground">
        {currentNumber} / {matchCount}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Previous match"
        disabled={matchCount === 0}
        onClick={prevMatch}
      >
        <ChevronUp className="size-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Next match"
        disabled={matchCount === 0}
        onClick={nextMatch}
      >
        <ChevronDown className="size-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Close search"
        onClick={clearSearch}
      >
        <X className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
