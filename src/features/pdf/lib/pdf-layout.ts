export type PdfContainerWidthGetter = () => number;

let containerWidthGetter: PdfContainerWidthGetter | null = null;

export function setPdfContainerWidthGetter(
  getter: PdfContainerWidthGetter | null,
) {
  containerWidthGetter = getter;
}

export function getPdfContainerWidth(): number {
  return containerWidthGetter?.() ?? window.innerWidth;
}

export async function fitPdfToWidth(
  doc: import("pdfjs-dist").PDFDocumentProxy,
  setScale: (scale: number) => void,
) {
  const firstPage = await doc.getPage(1);
  const pageWidth = firstPage.getViewport({ scale: 1 }).width;
  const containerWidth = getPdfContainerWidth();
  const fitted = (containerWidth - 48) / pageWidth;
  setScale(fitted);
}
