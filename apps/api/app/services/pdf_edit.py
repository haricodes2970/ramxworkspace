"""PDF text editing service backed by PyMuPDF.

Performs true content-stream text replacement: the original glyphs are
removed with a fill-less redaction (background graphics survive) and the
replacement is inserted at the original baseline with the original font
size and color. The document is never touched by third-party services.
"""

from __future__ import annotations

import io

import pymupdf

MAX_ORIGINAL_TEXT_LENGTH = 500
MAX_REPLACEMENT_TEXT_LENGTH = 2000
MIN_PDF_BYTES = 4

# Standard-14 font names that PyMuPDF can use directly, mapped from the
# font name reported by the text extraction layer.
BUILTIN_FONTS = {
    "helv": "helv",
    "hebo": "helv",
    "tiro": "tiro",
    "tibo": "tiro",
    "cour": "cour",
    "cobo": "cour",
    "symb": "symb",
    "zadb": "zadb",
}


class PdfEditError(Exception):
    """Raised when a text replacement cannot be performed.

    `status` is the HTTP status code the API layer should return.
    """

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


def _to_builtin_font(font_name: str) -> str:
    normalized = (font_name or "").strip()
    if normalized in BUILTIN_FONTS:
        return BUILTIN_FONTS[normalized]
    if normalized == "Helvetica":
        return "helv"
    if normalized == "Times-Roman":
        return "tiro"
    if normalized == "Courier":
        return "cour"
    if normalized == "Symbol":
        return "symb"
    if normalized == "ZapfDingbats":
        return "zadb"
    return "helv"


def _hex_color_to_tuple(color: int) -> tuple[float, float, float]:
    return (
        ((color >> 16) & 0xFF) / 255.0,
        ((color >> 8) & 0xFF) / 255.0,
        (color & 0xFF) / 255.0,
    )


def _find_matching_span(page: pymupdf.Page, rect: pymupdf.Rect) -> dict | None:
    """Return the span whose bounding box contains the given rect center."""
    center = (rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2
    best: dict | None = None
    best_distance = float("inf")
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                bbox = pymupdf.Rect(span["bbox"])
                if not bbox.contains(pymupdf.Point(center)):
                    continue
                distance = abs(bbox.y1 - rect.y1)
                if distance < best_distance:
                    best_distance = distance
                    best = span
    return best


def replace_text_in_pdf(
    data: bytes,
    page_index: int,
    original_text: str,
    replacement_text: str,
    approx_rect: tuple[float, float, float, float] | None = None,
) -> bytes:
    """Replace `original_text` on one page with `replacement_text`.

    Returns the full re-serialized PDF. Raises PdfEditError on invalid
    input, missing pages, or text that cannot be located.
    """
    if not data or len(data) < MIN_PDF_BYTES:
        raise PdfEditError("Empty or truncated PDF data.")
    if data[:4] != b"%PDF":
        raise PdfEditError("File is not a PDF.", status=422)
    if page_index < 0:
        raise PdfEditError("Page index must be zero or greater.")
    if not original_text or not original_text.strip():
        raise PdfEditError("Original text must not be empty.")
    if len(original_text) > MAX_ORIGINAL_TEXT_LENGTH:
        raise PdfEditError("Original text is too long.", status=413)
    if len(replacement_text) > MAX_REPLACEMENT_TEXT_LENGTH:
        raise PdfEditError("Replacement text is too long.", status=413)

    try:
        doc = pymupdf.open(stream=io.BytesIO(data), filetype="pdf")
    except Exception as exc:  # noqa: BLE001 - pymupdf raises generic exceptions
        raise PdfEditError(f"Could not parse PDF: {exc}", status=422) from exc

    try:
        if page_index >= doc.page_count:
            raise PdfEditError(
                f"Page {page_index} does not exist (document has {doc.page_count} pages).",
                status=404,
            )
        page = doc[page_index]

        rects = page.search_for(original_text)
        if not rects:
            raise PdfEditError(
                f"Text {original_text!r} not found on page {page_index}.",
                status=404,
            )

        if approx_rect:
            target = pymupdf.Rect(approx_rect)
            rects.sort(
                key=lambda r: abs(r.x0 - target.x0) + abs(r.y0 - target.y0)
            )
        rect = rects[0]

        span = _find_matching_span(page, rect)
        font_size = span["size"] if span else 12.0
        color = span["color"] if span else 0
        font_name = span["font"] if span else "Helvetica"
        baseline = rect.y1 + (span["descender"] * font_size) if span else rect.y1 - font_size * 0.8

        page.add_redact_annot(rect, fill=None)
        page.apply_redactions()

        if replacement_text:
            builtin = _to_builtin_font(font_name)
            page.insert_text(
                (rect.x0, baseline),
                replacement_text,
                fontsize=font_size,
                color=_hex_color_to_tuple(color),
                fontname=builtin,
            )

        result = doc.tobytes(garbage=3, deflate=True)
    except PdfEditError:
        raise
    except Exception as exc:  # noqa: BLE001 - surface unexpected failures cleanly
        raise PdfEditError(f"Text replacement failed: {exc}", status=500) from exc
    finally:
        doc.close()

    return result