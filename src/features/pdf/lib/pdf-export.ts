import type { Color, PDFPage } from "pdf-lib";
import type { PdfPageEntry } from "@/features/pdf/store/pdf-pages-store";
import {
  transformFractionPoint,
  transformFractionRect,
  type PageRotation,
} from "@/features/pdf/lib/annotation-geometry";
import type {
  Annotation,
  AnnotationsByPage,
  DrawAnnotation,
  FractionPoint,
  FractionRect,
  RectAnnotation,
} from "@/features/pdf/types/annotation";

export type PdfExportResult = {
  bytes: Uint8Array;
  pageCount: number;
};

/**
 * Convert a fraction relative to the displayed page box (top-left origin)
 * into PDF MediaBox coordinates (bottom-left origin) for the given total
 * clockwise rotation.
 */
export function fractionToPdfPoint(
  point: FractionPoint,
  width: number,
  height: number,
  totalRotation: PageRotation,
): FractionPoint {
  const { x: fx, y: fy } = point;
  switch (totalRotation) {
    case 90:
      return { x: fy * width, y: fx * height };
    case 180:
      return { x: fx * width, y: fy * height };
    case 270:
      return { x: (1 - fy) * width, y: (1 - fx) * height };
    default:
      return { x: fx * width, y: (1 - fy) * height };
  }
}

export function fractionRectToPdfRect(
  rect: FractionRect,
  width: number,
  height: number,
  totalRotation: PageRotation,
): FractionRect {
  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.w, y: rect.y },
    { x: rect.x, y: rect.y + rect.h },
    { x: rect.x + rect.w, y: rect.y + rect.h },
  ].map((corner) => fractionToPdfPoint(corner, width, height, totalRotation));
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/**
 * Loads the source PDF, copies pages in current working order (deleted
 * pages are simply not copied), applies the combined rotation and flattens
 * annotations onto each page.
 */
export async function buildExportedPdf(
  sourceBytes: ArrayBuffer,
  pages: PdfPageEntry[],
  annotations: AnnotationsByPage,
): Promise<PdfExportResult> {
  const { PDFDocument, degrees, rgb } = await import("pdf-lib");
  const toColor = rgb as (r: number, g: number, b: number) => Color;

  const source = await PDFDocument.load(sourceBytes, {
    updateMetadata: false,
  });
  const output = await PDFDocument.create();

  const sourceIndexes = pages.map((entry) => entry.sourcePage - 1);
  const copiedPages = await output.copyPages(source, sourceIndexes);

  for (let i = 0; i < copiedPages.length; i += 1) {
    const page = copiedPages[i];
    const entry = pages[i];
    const sourceRotation = page.getRotation().angle as PageRotation;
    const total = ((sourceRotation + entry.rotation) % 360) as PageRotation;
    page.setRotation(degrees(total));
    output.addPage(page);

    const pageAnnotations = annotations[entry.id] ?? [];
    for (const annotation of pageAnnotations) {
      drawAnnotation(page, annotation, entry.rotation, total, toColor);
    }
  }

  const bytes = await output.save();
  return { bytes, pageCount: pages.length };
}

function hexToRgb(
  color: string,
  rgb: (r: number, g: number, b: number) => Color,
): Color {
  const hex = color.replace("#", "");
  const value = Number.parseInt(hex, 16);
  return rgb(
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  );
}

function drawAnnotation(
  page: PDFPage,
  annotation: Annotation,
  userRotation: PageRotation,
  totalRotation: PageRotation,
  rgb: (r: number, g: number, b: number) => Color,
) {
  if (annotation.type === "draw") {
    drawDrawAnnotation(page, annotation, userRotation, totalRotation, rgb);
    return;
  }
  if (annotation.type === "text" || annotation.type === "note") {
    return;
  }
  drawRectAnnotation(page, annotation, userRotation, totalRotation, rgb);
}

function drawDrawAnnotation(
  page: PDFPage,
  annotation: DrawAnnotation,
  userRotation: PageRotation,
  totalRotation: PageRotation,
  rgb: (r: number, g: number, b: number) => Color,
) {
  if (annotation.points.length < 2) return;
  const { width, height } = page.getSize();
  const pageSpaceHeight = userRotation % 180 === 0 ? height : width;
  const points = annotation.points.map((point) => {
    const display = transformFractionPoint(point, userRotation);
    const pdf = fractionToPdfPoint(display, width, height, totalRotation);
    return { x: roundCoord(pdf.x), y: roundCoord(pdf.y) };
  });
  const path = `M ${points[0].x} ${points[0].y} ${points
    .slice(1)
    .map((point) => `L ${point.x} ${point.y}`)
    .join(" ")}`;
  const color = hexToRgb(annotation.color, rgb);
  page.drawSvgPath(path, {
    x: 0,
    y: 0,
    color: rgb(1, 1, 1),
    opacity: 0,
    borderColor: color,
    borderWidth: annotation.strokeWidth * pageSpaceHeight,
    borderOpacity: 1,
  });
}

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function drawRectAnnotation(
  page: PDFPage,
  annotation: RectAnnotation,
  userRotation: PageRotation,
  totalRotation: PageRotation,
  rgb: (r: number, g: number, b: number) => Color,
) {
  const { width, height } = page.getSize();
  const color = hexToRgb(annotation.color, rgb);

  for (const rect of annotation.rects) {
    const display = transformFractionRect(rect, userRotation);
    const pdfRect = fractionRectToPdfRect(
      display,
      width,
      height,
      totalRotation,
    );

    if (annotation.type === "highlight") {
      page.drawRectangle({
        x: pdfRect.x,
        y: pdfRect.y,
        width: pdfRect.w,
        height: pdfRect.h,
        color,
        opacity: 0.45,
      });
      continue;
    }

    const lineFraction = annotation.type === "underline" ? 0.9 : 0.5;
    const lineY = display.y + display.h * lineFraction;
    const start = fractionToPdfPoint(
      { x: display.x, y: lineY },
      width,
      height,
      totalRotation,
    );
    const end = fractionToPdfPoint(
      { x: display.x + display.w, y: lineY },
      width,
      height,
      totalRotation,
    );
    page.drawLine({
      start,
      end,
      thickness: display.h * 8,
      color,
    });
  }
}
