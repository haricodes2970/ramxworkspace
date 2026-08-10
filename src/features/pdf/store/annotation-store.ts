"use client";

import { create } from "zustand";
import {
  DEFAULT_COLORS,
  type Annotation,
  type AnnotationTool,
  type AnnotationType,
  type AnnotationsByPage,
  type FractionPoint,
  type FractionRect,
} from "@/features/pdf/types/annotation";

const HISTORY_LIMIT = 50;

function cloneSnapshots(snapshots: AnnotationsByPage): AnnotationsByPage {
  return structuredClone(snapshots);
}

type AnnotationStore = {
  activeTool: AnnotationTool;
  annotations: AnnotationsByPage;
  selectedId: string | null;
  past: AnnotationsByPage[];
  future: AnnotationsByPage[];
  undoGroupBase: AnnotationsByPage | null;

  setTool: (tool: AnnotationTool) => void;
  selectAnnotation: (id: string | null) => void;
  clearSelection: () => void;
  addAnnotation: (annotation: Annotation) => void;
  addRectAnnotation: (
    page: number,
    type: "highlight" | "underline" | "strikeout",
    rects: FractionRect[],
  ) => string | null;
  addTextAnnotation: (page: number, position: FractionPoint) => string | null;
  addNoteAnnotation: (page: number, position: FractionPoint) => string | null;
  updateAnnotation: (
    id: string,
    patch: Partial<Annotation>,
    recordHistory?: boolean,
  ) => void;
  beginUndoGroup: () => void;
  endUndoGroup: () => void;
  deleteAnnotation: (id: string) => void;
  undo: () => void;
  redo: () => void;
};

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const useAnnotationStore = create<AnnotationStore>()((set, get) => ({
  activeTool: "select",
  annotations: {},
  selectedId: null,
  past: [],
  future: [],
  undoGroupBase: null,

  setTool: (tool) => set({ activeTool: tool, selectedId: null }),

  selectAnnotation: (id) => set({ selectedId: id }),

  clearSelection: () => set({ selectedId: null }),

  addAnnotation: (annotation) => {
    const current = cloneSnapshots(get().annotations);
    const pageAnnotations = current[annotation.page] ?? [];
    current[annotation.page] = [...pageAnnotations, annotation];

    const past = [...get().past, cloneSnapshots(get().annotations)].slice(
      -HISTORY_LIMIT,
    );
    set({ annotations: current, past, future: [], selectedId: annotation.id });
  },

  addRectAnnotation: (page, type, rects) => {
    if (rects.length === 0) return null;
    const id = newId();
    const annotation: Annotation = {
      id,
      type,
      page,
      color: DEFAULT_COLORS[type],
      rects,
    };
    get().addAnnotation(annotation);
    return id;
  },

  addTextAnnotation: (page, position) => {
    const id = newId();
    const annotation: Annotation = {
      id,
      type: "text",
      page,
      color: DEFAULT_COLORS.text,
      position,
      content: "",
      fontSize: 0.02,
    };
    get().addAnnotation(annotation);
    return id;
  },

  addNoteAnnotation: (page, position) => {
    const id = newId();
    const annotation: Annotation = {
      id,
      type: "note",
      page,
      color: DEFAULT_COLORS.note,
      position,
      content: "",
    };
    get().addAnnotation(annotation);
    return id;
  },

  updateAnnotation: (id, patch, recordHistory = true) => {
    const current = cloneSnapshots(get().annotations);
    for (const pageAnnotations of Object.values(current)) {
      const index = pageAnnotations.findIndex(
        (annotation) => annotation.id === id,
      );
      if (index !== -1) {
        pageAnnotations[index] = {
          ...pageAnnotations[index],
          ...patch,
        } as Annotation;
        break;
      }
    }

    if (!recordHistory) {
      set({ annotations: current });
      return;
    }

    const past = [...get().past, cloneSnapshots(get().annotations)].slice(
      -HISTORY_LIMIT,
    );
    set({ annotations: current, past, future: [] });
  },

  beginUndoGroup: () =>
    set({ undoGroupBase: cloneSnapshots(get().annotations) }),

  endUndoGroup: () => {
    const base = get().undoGroupBase;
    if (!base) return;
    set({
      past: [...get().past, base].slice(-HISTORY_LIMIT),
      future: [],
      undoGroupBase: null,
    });
  },

  deleteAnnotation: (id) => {
    const current = cloneSnapshots(get().annotations);
    for (const pageAnnotations of Object.values(current)) {
      const index = pageAnnotations.findIndex(
        (annotation) => annotation.id === id,
      );
      if (index !== -1) {
        pageAnnotations.splice(index, 1);
        break;
      }
    }

    const past = [...get().past, cloneSnapshots(get().annotations)].slice(
      -HISTORY_LIMIT,
    );
    set({
      annotations: current,
      past,
      future: [],
      selectedId: null,
    });
  },

  undo: () => {
    const { past, future, annotations } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      annotations: previous,
      past: past.slice(0, -1),
      future: [annotations, ...future].slice(0, HISTORY_LIMIT),
      selectedId: null,
    });
  },

  redo: () => {
    const { past, future, annotations } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      annotations: next,
      past: [...past, annotations].slice(-HISTORY_LIMIT),
      future: future.slice(1),
      selectedId: null,
    });
  },
}));

export function isRectAnnotationType(type: AnnotationType): boolean {
  return type === "highlight" || type === "underline" || type === "strikeout";
}
