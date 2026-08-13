import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  toPdfTextItem,
  type PdfTextItem,
} from "@/features/pdf/lib/pdf-text-layer";

export type PdfSearchMatch = {
  page: number;
  itemIndex: number;
  start: number;
  end: number;
};

type PageTextData = {
  items: PdfTextItem[];
  combined: string;
};

const textCache = new WeakMap<PDFDocumentProxy, Map<number, PageTextData>>();

function itemOffsetsToTextOffsets(
  items: PdfTextItem[],
): { itemIndex: number; start: number }[] {
  const offsets: { itemIndex: number; start: number }[] = [];
  let cursor = 0;
  items.forEach((item, index) => {
    offsets.push({ itemIndex: index, start: cursor });
    cursor += item.str.length;
  });
  return offsets;
}

function findInPage(
  data: PageTextData,
  page: number,
  query: string,
): PdfSearchMatch[] {
  const needle = query.toLowerCase();
  const haystack = data.combined.toLowerCase();
  const offsets = itemOffsetsToTextOffsets(data.items);
  const matches: PdfSearchMatch[] = [];

  let from = 0;
  while (true) {
    const index = haystack.indexOf(needle, from);
    if (index === -1) break;
    const end = index + needle.length;

    let itemIndex = offsets.length - 1;
    for (let i = 0; i < offsets.length; i += 1) {
      if (offsets[i].start <= index) itemIndex = i;
      else break;
    }

    const itemStart = offsets[itemIndex].start;
    const itemLength = data.items[itemIndex].str.length;
    if (end <= itemStart + itemLength) {
      matches.push({
        page,
        itemIndex,
        start: index - itemStart,
        end: end - itemStart,
      });
    }

    from = end;
  }

  return matches;
}

export async function getPageTextItems(
  doc: PDFDocumentProxy,
  pageNumber: number,
): Promise<PdfTextItem[]> {
  let cache = textCache.get(doc);
  if (!cache) {
    cache = new Map();
    textCache.set(doc, cache);
  }

  const cached = cache.get(pageNumber);
  if (cached) return cached.items;

  const page = await doc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const items: PdfTextItem[] = textContent.items
    .filter((item): item is { str: string } & typeof item => "str" in item)
    .map((item) =>
      toPdfTextItem(
        item as {
          str: string;
          transform: number[];
          width: number;
          height: number;
          fontName?: string;
        },
        textContent.styles,
      ),
    );

  const combined = items.map((item) => item.str).join("");
  cache.set(pageNumber, { items, combined });
  return items;
}

export async function findPdfMatches(
  doc: PDFDocumentProxy,
  query: string,
): Promise<PdfSearchMatch[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pages = Array.from({ length: doc.numPages }, (_, index) => index + 1);
  const pageData = await Promise.all(
    pages.map(async (page) => ({
      page,
      items: await getPageTextItems(doc, page),
    })),
  );

  const matches: PdfSearchMatch[] = [];
  for (const { page, items } of pageData) {
    const combined = items.map((item) => item.str).join("");
    matches.push(...findInPage({ items, combined }, page, trimmed));
  }

  return matches;
}
