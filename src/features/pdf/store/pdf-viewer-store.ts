"use client";

import type { PDFDocumentProxy } from "pdfjs-dist";
import { create } from "zustand";

export type PdfViewerStatus = "idle" | "loading" | "ready" | "error";

export type PdfSearchMatch = {
  page: number;
  itemIndex: number;
  start: number;
  end: number;
};

type PdfViewerState = {
  status: PdfViewerStatus;
  error: string | null;
  doc: PDFDocumentProxy | null;
  fileName: string | null;
  fileSize: number | null;
  numPages: number;
  scale: number;
  currentPage: number;
  thumbnailsOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  searchMatches: PdfSearchMatch[];
  searchResultIndex: number;

  setLoading: () => void;
  setError: (message: string) => void;
  setReady: (doc: PDFDocumentProxy, fileName: string, fileSize: number) => void;
  closeDocument: () => void;
  setScale: (scale: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setCurrentPage: (page: number) => void;
  toggleThumbnails: () => void;
  setThumbnailsOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSearchState: (query: string, matches: PdfSearchMatch[]) => void;
  setSearchResultIndex: (index: number) => void;
  clearSearch: () => void;
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
  fileName: null,
  fileSize: null,
  numPages: 0,
  scale: 1,
  currentPage: 1,
  thumbnailsOpen: true,
  searchOpen: false,
  searchQuery: "",
  searchMatches: [],
  searchResultIndex: -1,

  setLoading: () => set({ status: "loading", error: null }),
  setError: (message) => set({ status: "error", error: message }),
  setReady: (doc, fileName, fileSize) =>
    set({
      status: "ready",
      error: null,
      doc,
      fileName,
      fileSize,
      numPages: doc.numPages,
      currentPage: 1,
      scale: 1,
      searchQuery: "",
      searchMatches: [],
      searchResultIndex: -1,
    }),
  closeDocument: () =>
    set({
      status: "idle",
      error: null,
      doc: null,
      fileName: null,
      fileSize: null,
      numPages: 0,
      currentPage: 1,
      scale: 1,
      thumbnailsOpen: true,
      searchOpen: false,
      searchQuery: "",
      searchMatches: [],
      searchResultIndex: -1,
    }),
  setScale: (scale) => set({ scale: clampScale(scale) }),
  zoomIn: () => set({ scale: clampScale(get().scale * ZOOM_STEP) }),
  zoomOut: () => set({ scale: clampScale(get().scale / ZOOM_STEP) }),
  resetZoom: () => set({ scale: 1 }),
  setCurrentPage: (page) =>
    set({ currentPage: clampPage(page, get().numPages) }),
  toggleThumbnails: () => set({ thumbnailsOpen: !get().thumbnailsOpen }),
  setThumbnailsOpen: (open) => set({ thumbnailsOpen: open }),
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
}));
