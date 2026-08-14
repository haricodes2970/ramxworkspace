"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  clampFractionPoint,
  fractionPointFromEvent,
  fractionRectFromClientRect,
  inverseRotation,
  transformAnnotation,
  transformFractionPoint,
  transformFractionRect,
  type PageRotation,
} from "@/features/pdf/lib/annotation-geometry";
import { useAnnotationStore } from "@/features/pdf/store/annotation-store";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";
import { editPdfText } from "@/features/pdf/lib/pdf-edit";
import { fractionRectsToPdfRects } from "@/features/pdf/lib/pdf-edit-request";
import { pageIdToSourcePage } from "@/features/pdf/store/pdf-pages-store";
import { PdfEditPopover } from "@/features/pdf/components/pdf-edit-popover";
import {
  DEFAULT_COLORS,
  type FractionPoint,
  type FractionRect,
} from "@/features/pdf/types/annotation";

const PEN_WIDTH_PX = 3;
import type {
  Annotation,
  DrawAnnotation,
  RectAnnotation,
  TextAnnotation,
  NoteAnnotation,
} from "@/features/pdf/types/annotation";

type PdfAnnotationOverlayProps = {
  pageId: string;
  rotation: PageRotation;
  /** PDF-space page dimensions (rotation 0) for edit geometry. */
  pdfWidth?: number;
  pdfHeight?: number;
  /** Base rotation declared by the PDF itself, for edit geometry. */
  pdfBaseRotation?: number;
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
      data-annotation-id={annotation.id}
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
      data-annotation-id={annotation.id}
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
  pageSpaceHeight,
  editingId,
  onStartEdit,
  onCommit,
  onSelect,
}: {
  annotation: TextAnnotation;
  tool: string;
  pageSpaceHeight: number;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onCommit: (id: string, content: string) => void;
  onSelect: (id: string) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const editing = editingId === annotation.id;
  const interactive = tool === "select" || editing;

  useEffect(() => {
    if (editing && contentRef.current) {
      contentRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [editing]);

  return (
    <div
      data-annotation-id={annotation.id}
      className="absolute"
      style={{
        left: `${annotation.position.x * 100}%`,
        top: `${annotation.position.y * 100}%`,
        fontSize: `${annotation.fontSize * pageSpaceHeight}px`,
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
        ref={contentRef}
        contentEditable={editing}
        suppressContentEditableWarning
        spellCheck={false}
        aria-label="Text annotation"
        className={
          editing
            ? "min-w-16 rounded-sm border border-dashed border-ring bg-background px-1 outline-none"
            : "px-1"
        }
        onBlur={(event) =>
          onCommit(annotation.id, event.currentTarget.textContent ?? "")
        }
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.blur();
        }}
      >
        {annotation.content}
      </div>
    </div>
  );
}

function NoteShape({
  annotation,
  tool,
  editing,
  onStartEdit,
  onCommit,
  onSelect,
}: {
  annotation: NoteAnnotation;
  tool: string;
  editing: boolean;
  onStartEdit: (id: string) => void;
  onCommit: (id: string, content: string) => void;
  onSelect: (id: string) => void;
}) {
  const interactive = tool === "select";

  if (editing) {
    return (
      <div
        className="absolute z-10"
        style={{
          left: `${annotation.position.x * 100}%`,
          top: `${annotation.position.y * 100}%`,
        }}
      >
        <textarea
          autoFocus
          defaultValue={annotation.content}
          rows={3}
          aria-label="Sticky note content"
          placeholder="Write a note…"
          className="w-52 rounded-md border border-ring bg-background p-2 text-xs text-foreground shadow-md focus-visible:ring-2 focus-visible:ring-ring"
          onBlur={(event) => onCommit(annotation.id, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") event.currentTarget.blur();
          }}
        />
      </div>
    );
  }

  return (
    <div
      data-annotation-id={annotation.id}
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

export function PdfAnnotationOverlay({
  pageId,
  rotation,
  pdfWidth = 0,
  pdfHeight = 0,
  pdfBaseRotation = 0,
}: PdfAnnotationOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pageSize, setPageSize] = useState<PageSize>({ width: 0, height: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPoints, setDraftPoints] = useState<FractionPoint[] | null>(null);
  const [editDraft, setEditDraft] = useState<{
    text: string;
    fracRects: FractionRect[];
    clientRect: DOMRect;
  } | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const drawingRef = useRef(false);
  const draggingRef = useRef<{
    id: string;
    startPoint: FractionPoint;
    annotation: Annotation;
  } | null>(null);

  const activeTool = useAnnotationStore((state) => state.activeTool);
  const selectedId = useAnnotationStore((state) => state.selectedId);
  const annotations = useAnnotationStore((state) => state.annotations);
  const selectAnnotation = useAnnotationStore(
    (state) => state.selectAnnotation,
  );
  const updateAnnotation = useAnnotationStore(
    (state) => state.updateAnnotation,
  );
  const deleteAnnotation = useAnnotationStore(
    (state) => state.deleteAnnotation,
  );
  const addRectAnnotation = useAnnotationStore(
    (state) => state.addRectAnnotation,
  );
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const addTextAnnotation = useAnnotationStore(
    (state) => state.addTextAnnotation,
  );
  const addNoteAnnotation = useAnnotationStore(
    (state) => state.addNoteAnnotation,
  );
  const beginUndoGroup = useAnnotationStore((state) => state.beginUndoGroup);
  const endUndoGroup = useAnnotationStore((state) => state.endUndoGroup);
  const applyTextEdit = usePdfViewerStore((state) => state.applyTextEdit);
  const sourceBytes = usePdfViewerStore((state) => state.sourceBytes);

  const pageAnnotations = useMemo(
    () => annotations[pageId] ?? [],
    [annotations, pageId],
  );
  const displayAnnotations = useMemo(
    () =>
      pageAnnotations.map((annotation) =>
        transformAnnotation(annotation, rotation),
      ),
    [pageAnnotations, rotation],
  );
  const selectedAnnotation = useMemo(
    () =>
      displayAnnotations.find((annotation) => annotation.id === selectedId) ??
      null,
    [displayAnnotations, selectedId],
  );
  const pageSpaceHeight =
    rotation % 180 === 0 ? pageSize.height : pageSize.width;

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

  useEffect(() => {
    drawingRef.current = false;
    draggingRef.current = null;
    setDraftPoints(null);
  }, [activeTool, pageId, rotation]);

  useEffect(() => {
    setEditingId(null);
  }, [pageId]);

  const rootPointerEvents =
    activeTool === "pen" || activeTool === "text" || activeTool === "note"
      ? "auto"
      : "none";

  const toPagePoint = (point: FractionPoint): FractionPoint =>
    transformFractionPoint(point, inverseRotation(rotation));

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTool !== "pen") return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    event.preventDefault();
    drawingRef.current = true;
    overlay.setPointerCapture(event.pointerId);
    setDraftPoints([
      clampFractionPoint(
        toPagePoint(
          fractionPointFromEvent(event, overlay.getBoundingClientRect()),
        ),
      ),
    ]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current || activeTool !== "pen") return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    setDraftPoints((current) => [
      ...(current ?? []),
      clampFractionPoint(
        toPagePoint(
          fractionPointFromEvent(event, overlay.getBoundingClientRect()),
        ),
      ),
    ]);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const overlay = overlayRef.current;
    if (!overlay) return;
    if (overlay.hasPointerCapture(event.pointerId)) {
      overlay.releasePointerCapture(event.pointerId);
    }
    if (draftPoints && draftPoints.length > 1) {
      const id = crypto.randomUUID();
      addAnnotation({
        id,
        type: "draw",
        page: pageId,
        color: DEFAULT_COLORS.draw,
        points: draftPoints,
        strokeWidth: PEN_WIDTH_PX / (pageSpaceHeight || 1),
      });
    }
    setDraftPoints(null);
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "text" && activeTool !== "note") return;
    const overlay = overlayRef.current;
    if (!overlay) return;
    const point = clampFractionPoint(
      toPagePoint(
        fractionPointFromEvent(event, overlay.getBoundingClientRect()),
      ),
    );
    if (activeTool === "text") {
      const id = addTextAnnotation(pageId, point);
      if (id) setEditingId(id);
    } else {
      const id = addNoteAnnotation(pageId, point);
      if (id) setEditingId(id);
    }
  };

  const handleSelectPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (activeTool !== "select") return;
    const overlay = overlayRef.current;
    if (!overlay) return;

    const target = event.target as Element | null;
    const annotationId = target
      ?.closest("[data-annotation-id]")
      ?.getAttribute("data-annotation-id");
    if (!annotationId) return;

    const annotation = pageAnnotations.find(
      (candidate) => candidate.id === annotationId,
    );
    if (!annotation) return;

    event.preventDefault();
    draggingRef.current = {
      id: annotationId,
      startPoint: clampFractionPoint(
        toPagePoint(
          fractionPointFromEvent(event, overlay.getBoundingClientRect()),
        ),
      ),
      annotation,
    };
    beginUndoGroup();
    overlay.setPointerCapture(event.pointerId);
  };

  const handleSelectPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const drag = draggingRef.current;
    const overlay = overlayRef.current;
    if (!drag || !overlay || activeTool !== "select") return;

    const current = clampFractionPoint(
      toPagePoint(
        fractionPointFromEvent(event, overlay.getBoundingClientRect()),
      ),
    );
    const delta = {
      x: current.x - drag.startPoint.x,
      y: current.y - drag.startPoint.y,
    };

    const original = drag.annotation;
    if (original.type === "draw") {
      updateAnnotation(
        drag.id,
        {
          points: original.points.map((point) =>
            clampFractionPoint({ x: point.x + delta.x, y: point.y + delta.y }),
          ),
        },
        false,
      );
    } else if (original.type === "text" || original.type === "note") {
      updateAnnotation(
        drag.id,
        {
          position: clampFractionPoint({
            x: original.position.x + delta.x,
            y: original.position.y + delta.y,
          }),
        },
        false,
      );
    }
  };

  const handleSelectPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = draggingRef.current;
    const overlay = overlayRef.current;
    if (!drag || !overlay) return;
    draggingRef.current = null;
    if (overlay.hasPointerCapture(event.pointerId)) {
      overlay.releasePointerCapture(event.pointerId);
    }
    endUndoGroup();
  };

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const captureTextSelection = () => {
      if (
        activeTool !== "highlight" &&
        activeTool !== "underline" &&
        activeTool !== "strikeout"
      ) {
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
          rects.push(
            transformFractionRect(
              fractionRectFromClientRect(clientRect, containerRect),
              inverseRotation(rotation),
            ),
          );
        }
      }

      if (rects.length === 0) return;
      selection.removeAllRanges();
      addRectAnnotation(pageId, activeTool, rects);
    };

    document.addEventListener("mouseup", captureTextSelection);
    document.addEventListener("touchend", captureTextSelection);
    return () => {
      document.removeEventListener("mouseup", captureTextSelection);
      document.removeEventListener("touchend", captureTextSelection);
    };
  }, [activeTool, pageId, addRectAnnotation, rotation]);

  useEffect(() => {
    if (activeTool !== "edit") {
      setEditDraft(null);
    }
  }, [activeTool]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const captureEditSelection = () => {
      if (activeTool !== "edit" || editBusy) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        return;
      }
      const text = selection.toString().trim();
      if (!text) return;

      const containerRect = overlay.getBoundingClientRect();
      const fracRects: FractionRect[] = [];
      let firstClientRect: DOMRect | null = null;
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
          if (!firstClientRect) firstClientRect = clientRect;
          fracRects.push(
            transformFractionRect(
              fractionRectFromClientRect(clientRect, containerRect),
              inverseRotation(rotation),
            ),
          );
        }
      }

      if (fracRects.length === 0 || !firstClientRect) return;
      selection.removeAllRanges();
      setEditDraft({
        text,
        fracRects,
        clientRect: firstClientRect,
      });
    };

    document.addEventListener("mouseup", captureEditSelection);
    document.addEventListener("touchend", captureEditSelection);
    return () => {
      document.removeEventListener("mouseup", captureEditSelection);
      document.removeEventListener("touchend", captureEditSelection);
    };
  }, [activeTool, rotation, editBusy]);

  const handleEditApply = async (replacementText: string) => {
    if (!editDraft || !sourceBytes) return;
    const width = pdfWidth || pageSize.width;
    const height = pdfHeight || pageSize.height;
    const totalRotation = ((pdfBaseRotation + rotation) % 360) as PageRotation;
    const rects = fractionRectsToPdfRects(
      editDraft.fracRects,
      width,
      height,
      totalRotation,
    );
    setEditBusy(true);
    try {
      const bytes = await editPdfText(sourceBytes, {
        page: pageIdToSourcePage(pageId) - 1,
        originalText: editDraft.text,
        replacementText,
        rects,
      });
      await applyTextEdit(bytes);
      setEditDraft(null);
    } finally {
      setEditBusy(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        pointerEvents: rootPointerEvents,
        zIndex: 3,
        touchAction: activeTool === "pen" ? "none" : undefined,
        cursor: activeTool === "pen" ? "crosshair" : undefined,
      }}
      onPointerDown={(event) => {
        handlePointerDown(event);
        handleSelectPointerDown(event);
      }}
      onPointerMove={(event) => {
        handlePointerMove(event);
        handleSelectPointerMove(event);
      }}
      onPointerUp={(event) => {
        handlePointerUp(event);
        handleSelectPointerUp(event);
      }}
      onPointerCancel={(event) => {
        handlePointerUp(event);
        handleSelectPointerUp(event);
      }}
      onClick={handleOverlayClick}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {displayAnnotations.map((annotation) => {
          if (
            annotation.type === "highlight" ||
            annotation.type === "underline" ||
            annotation.type === "strikeout"
          ) {
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
                pageHeight={pageSpaceHeight}
                onSelect={selectAnnotation}
              />
            );
          }
          return null;
        })}

        {draftPoints && draftPoints.length > 1 && (
          <polyline
            points={draftPoints
              .map((point) => {
                const display = transformFractionPoint(point, rotation);
                return `${display.x * 100},${display.y * 100}`;
              })
              .join(" ")}
            fill="none"
            stroke={DEFAULT_COLORS.draw}
            strokeWidth={PEN_WIDTH_PX}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
      </svg>

      {displayAnnotations.map((annotation) => {
        if (annotation.type === "text") {
          return (
            <TextShape
              key={annotation.id}
              annotation={annotation}
              tool={activeTool}
              pageSpaceHeight={pageSpaceHeight}
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
              editing={editingId === annotation.id}
              onStartEdit={setEditingId}
              onCommit={(id, content) => {
                updateAnnotation(id, { content });
                setEditingId(null);
              }}
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
          className="absolute flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-xs text-destructive shadow-md focus-visible:ring-2 focus-visible:ring-ring"
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

      {editDraft && !editBusy && (
        <PdfEditPopover
          originalText={editDraft.text}
          position={editPopoverPosition(
            editDraft.clientRect,
            overlayRef.current,
          )}
          onCancel={() => setEditDraft(null)}
          onApply={handleEditApply}
        />
      )}
      {editDraft && editBusy && (
        <div className="absolute inset-x-0 top-2 z-50 flex justify-center">
          <div className="rounded-md bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-md">
            Replacing text…
          </div>
        </div>
      )}
    </div>
  );
}

function editPopoverPosition(
  clientRect: DOMRect,
  overlay: HTMLDivElement | null,
): { left: number; top: number } {
  const containerRect = overlay?.getBoundingClientRect();
  if (!containerRect) return { left: 8, top: 8 };
  const POPOVER_WIDTH = 320;
  const left = Math.min(
    Math.max(8, clientRect.left - containerRect.left),
    Math.max(8, containerRect.width - POPOVER_WIDTH - 8),
  );
  return {
    left,
    top: clientRect.bottom - containerRect.top + 6,
  };
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
