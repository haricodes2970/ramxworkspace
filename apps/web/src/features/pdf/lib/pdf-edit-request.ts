import { fractionRectToPdfRect } from "@/features/pdf/lib/pdf-export";
import type { FractionRect } from "@/features/pdf/types/annotation";
import type { PageRotation } from "@/features/pdf/lib/annotation-geometry";

export type TextEditRect = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type TextEditRequest = {
  /** Zero-based page index within the source PDF. */
  page: number;
  originalText: string;
  replacementText: string;
  /** Approximate PDF-space rectangles (bottom-left origin) used to
   * disambiguate repeated occurrences of the original text. */
  rects: TextEditRect[];
};

export class TextEditError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TextEditError";
    this.status = status;
  }
}

/**
 * Convert fraction-space selection rectangles (display box, top-left
 * origin, user-rotation 0) into approximate PDF-space rectangles
 * (bottom-left origin) for the edit service, mirroring the export
 * geometry pipeline exactly.
 */
export function fractionRectsToPdfRects(
  fractionRects: FractionRect[],
  width: number,
  height: number,
  totalRotation: PageRotation,
): TextEditRect[] {
  return fractionRects.map((fractionRect) => {
    const pdfRect = fractionRectToPdfRect(
      fractionRect,
      width,
      height,
      totalRotation,
    );
    return {
      x0: pdfRect.x,
      y0: pdfRect.y,
      x1: pdfRect.x + pdfRect.w,
      y1: pdfRect.y + pdfRect.h,
    };
  });
}

export function buildTextEditRequest(
  page: number,
  originalText: string,
  replacementText: string,
  rects: TextEditRect[],
): TextEditRequest {
  return { page, originalText, replacementText, rects };
}

export type TextInsertRequest = {
  /** Zero-based page index within the source PDF. */
  page: number;
  /** The text run the user clicked (anchor for the insertion point). */
  anchorText: string;
  /** Raw character offset within the anchor (0 = before the anchor,
   * anchor length = after it). */
  offsetInAnchor: number;
  /** The text to insert at the anchor position (non-empty). */
  insertionText: string;
  /** Approximate PDF-space rectangle (bottom-left origin) used to
   * disambiguate repeated anchor occurrences. */
  rects: TextEditRect[];
};

export function buildTextInsertRequest(
  page: number,
  anchorText: string,
  offsetInAnchor: number,
  insertionText: string,
  rects: TextEditRect[],
): TextInsertRequest {
  return { page, anchorText, offsetInAnchor, insertionText, rects };
}
