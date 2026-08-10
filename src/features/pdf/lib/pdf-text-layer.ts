import type { PageViewport } from "pdfjs-dist";

export type PdfTextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
};

export type PdfMatchRange = {
  itemIndex: number;
  start: number;
  end: number;
  current: boolean;
};

function applyTransform(
  point: [number, number],
  matrix: number[],
): [number, number] {
  const [a, b, c, d, e, f] = matrix;
  return [a * point[0] + c * point[1] + e, b * point[0] + d * point[1] + f];
}

type TextBox = {
  left: number;
  top: number;
  fontHeight: number;
  scaleX: number;
};

function boxOf(item: PdfTextItem, viewport: PageViewport): TextBox {
  const [a, b, c, d, e, f] = item.transform;
  const [m0, m1, m2, m3, m4, m5] = viewport.transform;

  const toDevice = (point: [number, number]): [number, number] => {
    const pdf = applyTransform(point, [a, b, c, d, e, f]);
    return applyTransform(pdf, [m0, m1, m2, m3, m4, m5]);
  };

  const [x0, y0] = toDevice([0, 0]);
  const [x1, y1] = toDevice([item.width, 0]);
  const [, y2] = toDevice([0, item.height]);

  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1, y2);
  const fontHeight = Math.abs(y2 - y0) || Math.abs(y1 - y0) || 12;
  const textWidth = Math.abs(x1 - x0);
  const scaleX = textWidth > 0 ? textWidth / (fontHeight * 0.5) / 2 : 1;

  return { left, top, fontHeight, scaleX: Math.max(0.1, scaleX) };
}

function appendSpan(
  container: HTMLElement,
  text: string,
  box: TextBox,
  extraClass?: string,
) {
  const span = document.createElement("span");
  span.textContent = text;
  span.style.left = `${box.left}px`;
  span.style.top = `${box.top}px`;
  span.style.fontSize = `${box.fontHeight}px`;
  if (extraClass) span.classList.add(extraClass);
  if (box.scaleX !== 1) {
    span.style.transform = `scaleX(${box.scaleX})`;
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

  container.replaceChildren();

  items.forEach((item, itemIndex) => {
    const box = boxOf(item, viewport);
    const ranges = (byItem.get(itemIndex) ?? []).sort(
      (x, y) => x.start - y.start,
    );

    if (ranges.length === 0) {
      appendSpan(container, item.str, box);
      return;
    }

    let cursor = 0;
    for (const range of ranges) {
      if (range.start > cursor) {
        appendSpan(container, item.str.slice(cursor, range.start), box);
      }
      appendSpan(
        container,
        item.str.slice(range.start, range.end),
        box,
        range.current ? "pdf-match pdf-match-current" : "pdf-match",
      );
      cursor = range.end;
    }
    if (cursor < item.str.length) {
      appendSpan(container, item.str.slice(cursor), box);
    }
  });
}
