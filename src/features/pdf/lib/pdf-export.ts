import type { PdfPageEntry } from "@/features/pdf/store/pdf-pages-store";
import type { PageRotation } from "@/features/pdf/lib/annotation-geometry";
import type {
  FractionPoint,
  FractionRect,
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
 * pages are simply not copied) and applies the combined rotation.
 */
export async function buildExportedPdf(
  sourceBytes: ArrayBuffer,
  pages: PdfPageEntry[],
): Promise<PdfExportResult> {
  const { PDFDocument, degrees } = await import("pdf-lib");

  const source = await PDFDocument.load(sourceBytes, {
    updateMetadata: false,
  });
  const output = await PDFDocument.create();

  const sourceIndexes = pages.map((entry) => entry.sourcePage - 1);
  const copiedPages = await output.copyPages(source, sourceIndexes);

  for (let i = 0; i < copiedPages.length; i += 1) {
    const page = copiedPages[i];
    const sourceRotation = page.getRotation().angle as PageRotation;
    const total = ((sourceRotation + pages[i].rotation) % 360) as PageRotation;
    page.setRotation(degrees(total));
    output.addPage(page);
  }

  const bytes = await output.save();
  return { bytes, pageCount: pages.length };
}
