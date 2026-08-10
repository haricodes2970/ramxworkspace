export type PdfScrollBehavior = "auto" | "smooth";

type PdfScrollHandler = (
  page: number,
  behavior: PdfScrollBehavior,
) => void;

let scrollHandler: PdfScrollHandler | null = null;

export function setPdfScrollHandler(handler: PdfScrollHandler | null) {
  scrollHandler = handler;
}

export function scrollToPdfPage(
  page: number,
  behavior: PdfScrollBehavior = "smooth",
) {
  scrollHandler?.(page, behavior);
}
