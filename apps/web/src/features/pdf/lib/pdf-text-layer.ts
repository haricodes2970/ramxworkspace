import type { PageViewport } from "pdfjs-dist";

export type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  fontName?: string;
  fontFamily?: string;
  ascent?: number;
};

export type PdfMatchRange = {
  itemIndex: number;
  start: number;
  end: number;
  current: boolean;
};

export type PdfTextStyle = {
  fontFamily?: string;
  ascent?: number;
};

export const DEFAULT_FONT_ASCENT = 0.8;

const ANGLE_EPSILON = 1e-4;

function applyTransform(
  point: [number, number],
  matrix: number[],
): [number, number] {
  const [a, b, c, d, e, f] = matrix;
  return [a * point[0] + c * point[1] + e, b * point[0] + d * point[1] + f];
}

/**
 * Matrix multiplication following the pdf.js convention:
 * `compose(a, b)` applies `b` first, then `a` — i.e. `a ∘ b`.
 */
function compose(a: number[], b: number[]): number[] {
  const [a0, a1, a2, a3, a4, a5] = a;
  const [b0, b1, b2, b3, b4, b5] = b;
  return [
    a0 * b0 + a2 * b1,
    a1 * b0 + a3 * b1,
    a0 * b2 + a2 * b3,
    a1 * b2 + a3 * b3,
    a0 * b4 + a2 * b5 + a4,
    a1 * b4 + a3 * b5 + a5,
  ];
}

export function resolveFontFamily(item: PdfTextItem): string {
  return item.fontFamily || "sans-serif";
}

export function fontAscentRatio(item: PdfTextItem): number {
  if (typeof item.ascent === "number" && item.ascent > 0) {
    return item.ascent;
  }
  return DEFAULT_FONT_ASCENT;
}

export type TextBox = {
  left: number;
  top: number;
  fontHeight: number;
  textWidth: number;
  height: number;
};

/**
 * Compute the visual box of a text run in CSS/viewport coordinates.
 *
 * The text item transform is composed with the viewport transform (which
 * flips PDF's y-up space into CSS's y-down space). `TextItem.height` is a
 * length in PDF device space and is never fed back through the text matrix:
 * the em-top corner below uses the text-space offset `1` (one em).
 */
export function computeTextBox(
  item: PdfTextItem,
  viewport: Pick<PageViewport, "transform">,
): TextBox {
  const tx = compose(viewport.transform, item.transform);
  const fontHeight = Math.hypot(tx[2], tx[3]) || 1;
  const fontScale = Math.hypot(item.transform[0], item.transform[1]) || 1;
  const textSpaceWidth = item.width / fontScale;

  const toDevice = (point: [number, number]): [number, number] =>
    applyTransform(applyTransform(point, item.transform), viewport.transform);

  const corners = [
    toDevice([0, 0]),
    toDevice([textSpaceWidth, 0]),
    toDevice([0, 1]),
    toDevice([textSpaceWidth, 1]),
  ];
  const xs = corners.map((corner) => corner[0]);
  const ys = corners.map((corner) => corner[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const angle = Math.abs(Math.atan2(tx[1], tx[0]));
  const axisAligned =
    angle < ANGLE_EPSILON || Math.abs(angle - Math.PI) < ANGLE_EPSILON;

  const left = axisAligned ? tx[4] : minX;
  const top = axisAligned ? tx[5] - fontHeight * fontAscentRatio(item) : minY;
  const height = axisAligned ? fontHeight : maxY - minY;

  return { left, top, fontHeight, textWidth: maxX - minX, height };
}

export function computeScaleX(
  textWidth: number,
  measuredCssWidth: number,
): number {
  if (textWidth <= 0 || measuredCssWidth <= 0) return 1;
  return Math.max(0.01, textWidth / measuredCssWidth);
}

export function toPdfTextItem(
  item: {
    str: string;
    transform: number[];
    width: number;
    height: number;
    fontName?: string;
  },
  styles?: Record<string, PdfTextStyle> | null,
): PdfTextItem {
  const fontName = item.fontName;
  const style = fontName ? styles?.[fontName] : undefined;
  return {
    str: item.str,
    transform: [...item.transform],
    width: item.width,
    height: item.height,
    fontName,
    fontFamily: style?.fontFamily,
    ascent:
      typeof style?.ascent === "number" && style.ascent > 0
        ? style.ascent
        : undefined,
  };
}

function measureCssWidth(
  context: CanvasRenderingContext2D | null,
  text: string,
  fontHeight: number,
  fontFamily: string,
): number {
  if (!context || text.length <= 1) return 0;
  context.font = `${fontHeight}px ${fontFamily}`;
  return context.measureText(text).width;
}

function appendSpan(
  container: HTMLElement,
  text: string,
  box: TextBox,
  fontFamily: string,
  scaleX: number,
  extraClass?: string,
  data?: Record<string, string>,
) {
  const span = document.createElement("span");
  span.textContent = text;
  span.style.left = `${box.left}px`;
  span.style.top = `${box.top}px`;
  span.style.fontSize = `${box.fontHeight}px`;
  span.style.fontFamily = fontFamily;
  span.style.lineHeight = "1";
  span.style.transformOrigin = "0% 0%";
  if (scaleX !== 1) {
    span.style.transform = `scaleX(${scaleX})`;
  }
  if (extraClass) span.classList.add(extraClass);
  if (data) {
    for (const [key, value] of Object.entries(data)) {
      span.dataset[key] = value;
    }
  }
  container.appendChild(span);
}

export function renderPdfTextLayer({
  container,
  items,
  viewport,
  matches,
}: {
  container: HTMLElement;
  items: PdfTextItem[];
  viewport: PageViewport;
  matches: PdfMatchRange[];
}) {
  const byItem = new Map<number, PdfMatchRange[]>();
  for (const match of matches) {
    const list = byItem.get(match.itemIndex) ?? [];
    list.push(match);
    byItem.set(match.itemIndex, list);
  }

  const measureCanvas = document.createElement("canvas");
  const measureContext = measureCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  container.replaceChildren();

  items.forEach((item, itemIndex) => {
    const box = computeTextBox(item, viewport);
    const fontFamily = resolveFontFamily(item);
    const measuredWidth = measureCssWidth(
      measureContext,
      item.str,
      box.fontHeight,
      fontFamily,
    );
    const scaleX = computeScaleX(box.textWidth, measuredWidth);
    const ranges = (byItem.get(itemIndex) ?? []).sort(
      (x, y) => x.start - y.start,
    );

    if (ranges.length === 0) {
      appendSpan(container, item.str, box, fontFamily, scaleX, undefined, {
        editItem: String(itemIndex),
        editStart: "0",
      });
      return;
    }

    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) {
        appendSpan(
          container,
          item.str.slice(cursor, range.start),
          box,
          fontFamily,
          scaleX,
          undefined,
          {
            editItem: String(itemIndex),
            editStart: String(cursor),
          },
        );
      }
      appendSpan(
        container,
        item.str.slice(range.start, range.end),
        box,
        fontFamily,
        scaleX,
        range.current ? "pdf-match pdf-match-current" : "pdf-match",
        {
          editItem: String(itemIndex),
          editStart: String(range.start),
        },
      );
      cursor = range.end;
    }
    if (cursor < item.str.length) {
      appendSpan(
        container,
        item.str.slice(cursor),
        box,
        fontFamily,
        scaleX,
        undefined,
        {
          editItem: String(itemIndex),
          editStart: String(cursor),
        },
      );
    }
  });
}
