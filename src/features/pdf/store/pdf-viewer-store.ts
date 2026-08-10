"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { create } from "zustand";
import {
  findPdfMatches,
  type PdfSearchMatch,
} from "@/features/pdf/lib/pdf-search";

export type PdfViewerStatus = "idle" | "loading" | "ready" | "error";

type PdfViewerState = {
  status: PdfViewerStatus;
  error: string | null;
  doc: PDFDocumentProxy | null;
  sourceBytes: ArrayBuffer | null;
  fileName: string | null;
  fileSize: number | null;
  numPages: number;
  scale: number;
  currentPage: number;
  thumbnailsOpen: boolean;
  mobileThumbsOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  searchMatches: PdfSearchMatch[];
  searchResultIndex: number;

  setLoading: () => void;
  setError: (message: string) => void;
  setReady: (
    doc: PDFDocumentProxy,
    fileName: string,
    fileSize: number,
    sourceBytes: ArrayBuffer,
  ) => void;
  closeDocument: () => void;
  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setCurrentPage: (page: number) => void;
  toggleThumbnails: () => void;
  setThumbnailsOpen: (open: boolean) => void;
  setMobileThumbsOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchState: (query: string, matches: PdfSearchMatch[]) => void;
  setSearchResultIndex: (index: number) => void;
  clearSearch: () => void;
  runSearch: (query: string) => Promise<void>;
  nextMatch: () => void;
  prevMatch: () => void;
};

export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;
export const ZOOM_STEP = 1.2;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function clampPage(page: number, numPages: number) {
  return Math.min(numPages, Math.max(1, page));
}

export const usePdfViewerStore = create<PdfViewerState>()((set, get) => ({
  status: "idle",
  error: null,
  doc: null,
  sourceBytes: null,
  fileName: null,
  fileSize: null,
  numPages: 0,
  scale: 1,
  currentPage: 1,
  thumbnailsOpen: true,
  mobileThumbsOpen: false,
  searchOpen: false,
  searchQuery: "",
  searchMatches: [],
  searchResultIndex: -1,

  setLoading: () => set({ status: "loading", error: null }),
  setError: (message) => set({ status: "error", error: message }),
  setReady: (doc, fileName, fileSize, sourceBytes) => {
    const previous = get().doc;
    if (previous && previous !== doc) {
      void previous.destroy();
    }
    set({
      status: "ready",
      error: null,
      doc,
      sourceBytes,
      fileName,
      fileSize,
      numPages: doc.numPages,
      currentPage: 1,
      scale: 1,
      searchQuery: "",
      searchMatches: [],
      searchResultIndex: -1,
    });
  },
  closeDocument: () => {
    const current = get().doc;
    if (current) {
      void current.destroy();
    }
    set({
      status: "idle",
      error: null,
      doc: null,
      sourceBytes: null,
      fileName: null,
      fileSize: null,
      numPages: 0,
      currentPage: 1,
      scale: 1,
      thumbnailsOpen: true,
      mobileThumbsOpen: false,
      searchOpen: false,
      searchQuery: "",
      searchMatches: [],
      searchResultIndex: -1,
    });
  },
  setScale: (scale) => set({ scale: clampScale(scale) }),
  zoomIn: () => set({ scale: clampScale(get().scale * ZOOM_STEP) }),
  zoomOut: () => set({ scale: clampScale(get().scale / ZOOM_STEP) }),
  resetZoom: () => set({ scale: 1 }),
  setCurrentPage: (page) =>
    set({ currentPage: clampPage(page, get().numPages) }),
  toggleThumbnails: () => set({ thumbnailsOpen: !get().thumbnailsOpen }),
  setThumbnailsOpen: (open) => set({ thumbnailsOpen: open }),
  setMobileThumbsOpen: (open) => set({ mobileThumbsOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchState: (query, matches) =>
    set({ searchQuery: query, searchMatches: matches, searchResultIndex: 0 }),
  setSearchResultIndex: (index) => set({ searchResultIndex: index }),
  clearSearch: () =>
    set({
      searchQuery: "",
      searchMatches: [],
      searchResultIndex: -1,
      searchOpen: false,
    }),
  runSearch: async (query) => {
    const doc = get().doc;
    const trimmed = query.trim();
    const searchToken = (get().searchQuery = query);
    if (!doc || !trimmed) {
      set({ searchQuery: query, searchMatches: [], searchResultIndex: -1 });
      return;
    }
    const matches = await findPdfMatches(doc, trimmed);
    if (get().doc !== doc || get().searchQuery !== searchToken) return;
    set({
      searchQuery: query,
      searchMatches: matches,
      searchResultIndex: matches.length > 0 ? 0 : -1,
    });
  },
  nextMatch: () => {
    const { searchMatches, searchResultIndex } = get();
    if (searchMatches.length === 0) return;
    const next = (searchResultIndex + 1) % searchMatches.length;
    set({ searchResultIndex: next });
  },
  prevMatch: () => {
    const { searchMatches, searchResultIndex } = get();
    if (searchMatches.length === 0) return;
    const prev =
      (searchResultIndex - 1 + searchMatches.length) % searchMatches.length;
    set({ searchResultIndex: prev });
  },
}));
