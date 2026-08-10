"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fractionRectFromClientRect } from "@/features/pdf/lib/annotation-geometry";
import { useAnnotationStore } from "@/features/pdf/store/annotation-store";
import type {
  Annotation,
  DrawAnnotation,
  RectAnnotation,
  TextAnnotation,
  NoteAnnotation,
} from "@/features/pdf/types/annotation";

type PdfAnnotationOverlayProps = {
  pageNumber: number;
};

type PageSize = { width: number; height: number };

function RectShapes({
  annotation,
  tool,
  onSelect,
}: {
  annotation: RectAnnotation;
  tool: string;
  onSelect: (id: string) => void;
}) {
  const interactive = tool === "select";
  const fill =
    annotation.type === "highlight" ? annotation.color : "transparent";
  const strokeColor =
    annotation.type === "highlight" ? "none" : annotation.color;

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(annotation.id);
      }}
      className={interactive ? "cursor-pointer" : undefined}
    >
      {annotation.rects.map((rect, index) => (
        <g key={index}>
          <rect
            x={rect.x * 100}
            y={rect.y * 100}
            width={rect.w * 100}
            height={rect.h * 100}
            fill={fill}
            opacity={annotation.type === "highlight" ? 0.45 : 1}
            pointerEvents={interactive ? "visiblePainted" : "none"}
          />
          {annotation.type !== "highlight" && (
            <>
              <line
                x1={rect.x * 100}
                y1={(rect.y + rect.h * 0.9) * 100}
                x2={(rect.x + rect.w) * 100}
                y2={(rect.y + rect.h * 0.9) * 100}
                stroke={strokeColor}
                strokeWidth={rect.h * 8}
                strokeLinecap="round"
                pointerEvents="none"
              />
              {annotation.type === "strikeout" && (
                <line
                  x1={rect.x * 100}
                  y1={(rect.y + rect.h * 0.5) * 100}
                  x2={(rect.x + rect.w) * 100}
                  y2={(rect.y + rect.h * 0.5) * 100}
                  stroke={strokeColor}
                  strokeWidth={rect.h * 8}
                  strokeLinecap="round"
                  pointerEvents="none"
                />
              )}
            </>
          )}
        </g>
      ))}
    </g>
  );
}

function DrawShape({
  annotation,
  tool,
  pageHeight,
  onSelect,
}: {
  annotation: DrawAnnotation;
  tool: string;
  pageHeight: number;
  onSelect: (id: string) => void;
}) {
  const interactive = tool === "select";
  const points = annotation.points
    .map((point) => `${point.x * 100},${point.y * 100}`)
    .join(" ");
  const strokeWidthPx = annotation.strokeWidth * pageHeight;

  return (
    <polyline
      points={points}
      fill="none"
      stroke={annotation.color}
      strokeWidth={strokeWidthPx}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      pointerEvents={interactive ? "visiblePainted" : "none"}
      className={interactive ? "cursor-pointer" : undefined}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(annotation.id);
      }}
    />
  );
}

function TextShape({
  annotation,
  tool,
  pageSize,
  editingId,
  onStartEdit,
  onCommit,
  onSelect,
}: {
  annotation: TextAnnotation;
  tool: string;
  pageSize: PageSize;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onCommit: (id: string, content: string) => void;
  onSelect: (id: string) => void;
}) {
  const editing = editingId === annotation.id;
  const interactive = tool === "select" || editing;

  return (
    <div
      className="absolute"
      style={{
        left: `${annotation.position.x * 100}%`,
        top: `${annotation.position.y * 100}%`,
        fontSize: `${annotation.fontSize * pageSize.height}px`,
        color: annotation.color,
        lineHeight: 1.2,
        pointerEvents: interactive ? "auto" : "none",
        cursor: tool === "select" ? "move" : undefined,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(annotation.id);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onStartEdit(annotation.id);
      }}
    >
      <div
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={false}
        aria-label="Text annotation"
        className={
          editing
            ? "min-w-16 rounded-sm border border-dashed border-ring bg-background px-1 outline-none"
            : "px-1"
        }
        onBlur={(event) => onCommit(annotation.id, event.currentTarget.textContent ?? "")}
      >
        {annotation.content}
      </div>
    </div>
  );
}

function NoteShape({
  annotation,
  tool,
  onStartEdit,
  onSelect,
}: {
  annotation: NoteAnnotation;
  tool: string;
  onStartEdit: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const interactive = tool === "select";

  return (
    <div
      className="absolute"
      style={{
        left: `${annotation.position.x * 100}%`,
        top: `${annotation.position.y * 100}%`,
        pointerEvents: interactive ? "auto" : "none",
        cursor: "pointer",
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(annotation.id);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onStartEdit(annotation.id);
      }}
    >
      <div
        className="flex size-5 items-center justify-center rounded-sm border border-black/20 text-[10px] font-bold text-black shadow-sm"
        style={{ backgroundColor: annotation.color }}
        aria-label="Sticky note marker"
      >
        !
      </div>
    </div>
  );
}

export function PdfAnnotationOverlay({ pageNumber }: PdfAnnotationOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState<PageSize>({ width: 0, height: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeTool = useAnnotationStore((state) => state.activeTool);
  const selectedId = useAnnotationStore((state) => state.selectedId);
  const annotations = useAnnotationStore((state) => state.annotations);
  const selectAnnotation = useAnnotationStore((state) => state.selectAnnotation);
  const updateAnnotation = useAnnotationStore((state) => state.updateAnnotation);
  const deleteAnnotation = useAnnotationStore(
    (state) => state.deleteAnnotation,
  );
  const addRectAnnotation = useAnnotationStore(
    (state) => state.addRectAnnotation,
  );

  const pageAnnotations = useMemo(
    () => annotations[pageNumber] ?? [],
    [annotations, pageNumber],
  );
  const selectedAnnotation = useMemo(
    () =>
      pageAnnotations.find((annotation) => annotation.id === selectedId) ??
      null,
    [pageAnnotations, selectedId],
  );

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const updateSize = () => {
      const rect = overlay.getBoundingClientRect();
      setPageSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(overlay);
    return () => observer.disconnect();
  }, []);

  const rootPointerEvents =
    activeTool === "pen" || activeTool === "text" || activeTool === "note"
      ? "auto"
      : "none";

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const captureTextSelection = () => {
      if (activeTool !== "highlight" && activeTool !== "underline" && activeTool !== "strikeout") {
        return;
      }
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return;
      }

      const containerRect = overlay.getBoundingClientRect();
      const rects: ReturnType<typeof fractionRectFromClientRect>[] = [];
      for (let i = 0; i < selection.rangeCount; i += 1) {
        const range = selection.getRangeAt(i);
        for (const clientRect of Array.from(range.getClientRects())) {
          if (
            clientRect.width === 0 ||
            clientRect.height === 0 ||
            clientRect.bottom < containerRect.top ||
            clientRect.top > containerRect.bottom
          ) {
            continue;
          }
          rects.push(fractionRectFromClientRect(clientRect, containerRect));
        }
      }

      if (rects.length === 0) return;
      selection.removeAllRanges();
      addRectAnnotation(pageNumber, activeTool, rects);
    };

    document.addEventListener("mouseup", captureTextSelection);
    document.addEventListener("touchend", captureTextSelection);
    return () => {
      document.removeEventListener("mouseup", captureTextSelection);
      document.removeEventListener("touchend", captureTextSelection);
    };
  }, [activeTool, pageNumber, addRectAnnotation]);

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 overflow-hidden"
      style={{ pointerEvents: rootPointerEvents, zIndex: 3 }}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {pageAnnotations.map((annotation) => {
          if (annotation.type === "highlight" || annotation.type === "underline" || annotation.type === "strikeout") {
            return (
              <RectShapes
                key={annotation.id}
                annotation={annotation}
                tool={activeTool}
                onSelect={selectAnnotation}
              />
            );
          }
          if (annotation.type === "draw") {
            return (
              <DrawShape
                key={annotation.id}
                annotation={annotation}
                tool={activeTool}
                pageHeight={pageSize.height}
                onSelect={selectAnnotation}
              />
            );
          }
          return null;
        })}
      </svg>

      {pageAnnotations.map((annotation) => {
        if (annotation.type === "text") {
          return (
            <TextShape
              key={annotation.id}
              annotation={annotation}
              tool={activeTool}
              pageSize={pageSize}
              editingId={editingId}
              onStartEdit={setEditingId}
              onCommit={(id, content) => {
                updateAnnotation(id, { content });
                setEditingId(null);
              }}
              onSelect={selectAnnotation}
            />
          );
        }
        if (annotation.type === "note") {
          return (
            <NoteShape
              key={annotation.id}
              annotation={annotation}
              tool={activeTool}
              onStartEdit={setEditingId}
              onSelect={selectAnnotation}
            />
          );
        }
        return null;
      })}

      {selectedAnnotation && (
        <button
          type="button"
          aria-label="Delete annotation"
          className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-xs text-destructive shadow-md focus-visible:ring-2 focus-visible:ring-ring"
          style={{
            left: `${deleteButtonPosition(selectedAnnotation)[0] * 100}%`,
            top: `${deleteButtonPosition(selectedAnnotation)[1] * 100}%`,
            pointerEvents: "auto",
            zIndex: 5,
          }}
          onClick={(event) => {
            event.stopPropagation();
            deleteAnnotation(selectedId as string);
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

function deleteButtonPosition(annotation: Annotation): [number, number] {
  if (annotation.type === "text" || annotation.type === "note") {
    return [annotation.position.x, annotation.position.y];
  }
  if (annotation.type === "draw") {
    const first = annotation.points[0];
    return [first.x, first.y];
  }
  const first = annotation.rects[0];
  return [first.x + first.w, first.y];
}
