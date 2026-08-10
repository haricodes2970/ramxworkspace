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
