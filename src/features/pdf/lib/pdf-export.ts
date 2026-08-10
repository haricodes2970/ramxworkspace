import type { Color, PDFFont, PDFPage } from "pdf-lib";
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
  NoteAnnotation,
  RectAnnotation,
  TextAnnotation,
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
  const { PDFDocument, StandardFonts, degrees, rgb } = await import("pdf-lib");
  const toColor = rgb as (r: number, g: number, b: number) => Color;

  const source = await PDFDocument.load(sourceBytes, {
    updateMetadata: false,
  });
  const output = await PDFDocument.create();
  const helvetica = await output.embedStandardFont(StandardFonts.Helvetica);
  const helveticaBold = await output.embedStandardFont(
    StandardFonts.HelveticaBold,
  );

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
      drawAnnotation(
        page,
        annotation,
        entry.rotation,
        total,
        toColor,
        helvetica,
        helveticaBold,
      );
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
  helvetica: PDFFont,
  helveticaBold: PDFFont,
) {
  if (annotation.type === "draw") {
    drawDrawAnnotation(page, annotation, userRotation, totalRotation, rgb);
    return;
  }
  if (annotation.type === "text" || annotation.type === "note") {
    drawTextOrNoteAnnotation(
      page,
      annotation,
      userRotation,
      totalRotation,
      rgb,
      helvetica,
      helveticaBold,
    );
    return;
  }
  drawRectAnnotation(page, annotation, userRotation, totalRotation, rgb);
}

function drawTextOrNoteAnnotation(
  page: PDFPage,
  annotation: TextAnnotation | NoteAnnotation,
  userRotation: PageRotation,
  totalRotation: PageRotation,
  rgb: (r: number, g: number, b: number) => Color,
  helvetica: PDFFont,
  helveticaBold: PDFFont,
) {
  const { width, height } = page.getSize();
  const pageSpaceHeight = userRotation % 180 === 0 ? height : width;
  const pdfPoint = fractionToPdfPoint(
    transformFractionPoint(annotation.position, userRotation),
    width,
    height,
    totalRotation,
  );
  const color = hexToRgb(annotation.color, rgb);

  if (annotation.type === "text") {
    const content = annotation.content.trim();
    if (!content) return;
    const size = annotation.fontSize * pageSpaceHeight;
    const lines = content.split("\n");
    let baseline = pdfPoint.y - size * 0.8;
    for (const line of lines) {
      if (line.trim()) {
        page.drawText(line, {
          x: pdfPoint.x,
          y: baseline,
          size,
          font: helvetica,
          color,
        });
      }
      baseline -= size * 1.2;
    }
    return;
  }

  const markerSize = 20;
  const markerX = pdfPoint.x;
  const markerY = pdfPoint.y - markerSize;
  page.drawRectangle({
    x: markerX,
    y: markerY,
    width: markerSize,
    height: markerSize,
    color,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  });
  page.drawText("!", {
    x: markerX + markerSize * 0.35,
    y: markerY + markerSize * 0.18,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  const content = annotation.content.trim();
  if (content) {
    const size = 10;
    let baseline = markerY - 8;
    for (const line of content.split("\n")) {
      if (line.trim()) {
        page.drawText(line, {
          x: pdfPoint.x,
          y: baseline,
          size,
          font: helvetica,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
      baseline -= size * 1.25;
    }
  }
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
