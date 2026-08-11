"use client";

import { create } from "zustand";
import { scrollToPdfPage } from "@/features/pdf/lib/pdf-scroll";
import { useAnnotationStore } from "@/features/pdf/store/annotation-store";
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
  rotatePage: (pageId: string, direction: "cw" | "ccw") => void;
  movePage: (pageId: string, toIndex: number) => void;
  deletePage: (pageId: string) => void;
  clearPages: () => void;
};

export function pageIdForIndex(index: number): string {
  return `page-${index + 1}`;
}

export function pageIdToSourcePage(pageId: string): number {
  const parsed = Number(pageId.replace("page-", ""));
  return Number.isFinite(parsed) ? parsed : 1;
}

export function rotatePageEntry(
  entry: PdfPageEntry,
  direction: "cw" | "ccw",
): PdfPageEntry {
  const delta = direction === "cw" ? 90 : -90;
  const next = (((entry.rotation + delta) % 360) + 360) % 360;
  return { ...entry, rotation: next as PageRotation };
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

  rotatePage: (pageId, direction) => {
    const pages = get().pages.map((entry) =>
      entry.id === pageId ? rotatePageEntry(entry, direction) : entry,
    );
    set({ pages });
  },

  movePage: (pageId, toIndex) => {
    const pages = [...get().pages];
    const fromIndex = pages.findIndex((entry) => entry.id === pageId);
    if (fromIndex === -1) return;
    const clamped = Math.min(Math.max(toIndex, 0), pages.length - 1);
    if (clamped === fromIndex) return;
    const [entry] = pages.splice(fromIndex, 1);
    pages.splice(clamped, 0, entry);
    set({ pages });
    const currentPageId = get().currentPageId ?? pages[0].id;
    syncViewerCurrentPage(pages, currentPageId);
  },

  deletePage: (pageId) => {
    const { pages, currentPageId } = get();
    if (pages.length <= 1) return;
    const index = pages.findIndex((entry) => entry.id === pageId);
    if (index === -1) return;
    const nextPages = pages.filter((entry) => entry.id !== pageId);
    let nextCurrent = currentPageId;
    let deletedCurrent = false;
    if (currentPageId === pageId) {
      deletedCurrent = true;
      const fallbackIndex = Math.min(index, nextPages.length - 1);
      nextCurrent = nextPages[fallbackIndex].id;
    }
    set({ pages: nextPages, currentPageId: nextCurrent });
    usePdfViewerStore.setState({ numPages: nextPages.length });
    syncViewerCurrentPage(nextPages, nextCurrent ?? nextPages[0].id);
    useAnnotationStore.getState().removePageAnnotations(pageId);
    if (deletedCurrent) {
      const newIndex = nextPages.findIndex((entry) => entry.id === nextCurrent);
      scrollToPdfPage(newIndex + 1, "auto");
    }
  },

  clearPages: () => set({ pages: [], currentPageId: null }),
}));
