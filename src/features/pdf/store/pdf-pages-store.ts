"use client";

import { create } from "zustand";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";

export type PageRotation = 0 | 90 | 180 | 270;

export type PdfPageEntry = {
  id: string;
  sourcePage: number;
  rotation: PageRotation;
};

type PdfPagesState = {
  pages: PdfPageEntry[];
  currentPageId: string | null;

  initPages: (numPages: number) => void;
  setCurrentPage: (pageId: string) => void;
  clearPages: () => void;
};

export function pageIdForIndex(index: number): string {
  return `page-${index + 1}`;
}

export function pageIdToSourcePage(pageId: string): number {
  const parsed = Number(pageId.replace("page-", ""));
  return Number.isFinite(parsed) ? parsed : 1;
}

function syncViewerCurrentPage(pages: PdfPageEntry[], currentPageId: string) {
  const index = pages.findIndex((entry) => entry.id === currentPageId);
  usePdfViewerStore.getState().setCurrentPage(index + 1);
}

export const usePdfPagesStore = create<PdfPagesState>()((set, get) => ({
  pages: [],
  currentPageId: null,

  initPages: (numPages) => {
    const pages: PdfPageEntry[] = Array.from({ length: numPages }, (_, i) => ({
      id: pageIdForIndex(i),
      sourcePage: i + 1,
      rotation: 0,
    }));
    set({ pages, currentPageId: pageIdForIndex(0) });
    usePdfViewerStore.getState().setCurrentPage(1);
  },

  setCurrentPage: (pageId) => {
    if (get().currentPageId === pageId) return;
    set({ currentPageId: pageId });
    syncViewerCurrentPage(get().pages, pageId);
  },

  clearPages: () => set({ pages: [], currentPageId: null }),
}));
