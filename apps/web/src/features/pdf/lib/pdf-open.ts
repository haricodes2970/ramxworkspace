type PdfOpenHandler = () => void;

let openHandler: PdfOpenHandler | null = null;

export function setPdfOpenHandler(handler: PdfOpenHandler | null) {
  openHandler = handler;
}

export function openPdfFile() {
  openHandler?.();
}
