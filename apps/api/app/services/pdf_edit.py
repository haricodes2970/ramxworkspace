"""PDF text editing service backed by PyMuPDF.

Performs true content-stream text replacement: the matching glyphs are
removed with fill-less per-character redaction (background graphics and
unrelated glyphs survive) and the replacement is inserted at the original
baseline. When the source font is embedded, its font program is reused
via insert_font/extract_font for real font fidelity; otherwise a
Standard-14 equivalent is used at the original size and color. The
document is never touched by third-party services.
"""

from __future__ import annotations

import io
import random
import string

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

# Ligature glyphs decomposed to their ASCII sequences so text produced by
# font cmaps (fi, fl, ffi, ...) matches the client's selected string.
LIGATURE_MAP = {
    0xFB00: "ff",
    0xFB01: "fi",
    0xFB02: "fl",
    0xFB03: "ffi",
    0xFB04: "ffl",
    0xFB05: "st",
    0xFB06: "st",
    0xFB29: "+",
}


class PdfEditError(Exception):
    """Raised when a text replacement cannot be performed.

    `status` is the HTTP status code the API layer should return.
    """

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status = status


class _Char:
    __slots__ = ("text", "raw", "bbox", "origin", "font", "size", "color", "baseline", "line", "block")

    def __init__(self, text, raw, bbox, origin, font, size, color, baseline, line, block):
        self.text = text
        self.raw = raw
        self.bbox = bbox
        self.origin = origin
        self.font = font
        self.size = size
        self.color = color
        self.baseline = baseline
        self.line = line
        self.block = block


def _normalize_char(char: str) -> str:
    """Normalize one character for matching without losing identity."""
    code = ord(char)
    if code in LIGATURE_MAP:
        return LIGATURE_MAP[code]
    if code == 0x00AD:  # soft hyphen: invisible in most renderings
        return ""
    if char.isspace():
        return " "
    return char


def _normalize_text(text: str) -> str:
    mapped = [_normalize_char(c) for c in text]
    collapsed = []
    previous_space = False
    for part in mapped:
        if part == "":
            continue
        if part == " ":
            if previous_space:
                continue
            previous_space = True
        else:
            previous_space = False
        collapsed.append(part)
    return "".join(collapsed)


def _page_char_stream(page: pymupdf.Page) -> list[_Char]:
    """Flatten the page into glyph records in reading order.

    A synthetic space is inserted between text lines so that multi-line
    selections (which the client joins with a line break) match the
    document stream, mirroring visual reading order.
    """
    records: list[_Char] = []
    for block in page.get_text("rawdict")["blocks"]:
        block_bbox = pymupdf.Rect(block["bbox"])
        for line_index, line in enumerate(block.get("lines", [])):
            line_spans = line.get("spans", [])
            if not line_spans:
                continue
            first_span = line_spans[0]
            size = first_span["size"]
            descender = first_span.get("descender", -0.2)
            baseline = first_span["origin"][1]
            if records and records[-1].text != " ":
                records.append(
                    _Char(
                        " ",
                        None,
                        None,
                        pymupdf.Point(first_span["origin"][0], baseline),
                        first_span["font"],
                        size,
                        first_span["color"],
                        baseline,
                        None,
                        None,
                    )
                )
            for span in line_spans:
                span_baseline = span["origin"][1]
                line_bbox = pymupdf.Rect(line["bbox"])
                for char in span.get("chars", []):
                    normalized = _normalize_char(char["c"])
                    if not normalized:
                        continue
                    records.append(
                        _Char(
                            normalized,
                            char["c"],
                            pymupdf.Rect(char["bbox"]),
                            pymupdf.Point(char["origin"]),
                            span["font"],
                            span["size"],
                            span["color"],
                            span_baseline,
                            line_bbox,
                            block_bbox,
                        )
                    )
    return records


def _find_matches(
    records: list[_Char],
    query: str,
    approx_rect: tuple[float, float, float, float] | None,
) -> tuple[int, int]:
    """Return the start/end record index of the best query match.

    Glyph records and stream characters can diverge in length (a ligature
    glyph normalizes to two characters), so a stream-position to record
    index mapping is used to convert match positions back to records.
    """
    stream = "".join(record.text for record in records)
    stream_to_record: list[int] = []
    for record_index, record in enumerate(records):
        stream_to_record.extend([record_index] * len(record.text))

    positions: list[int] = []
    start = 0
    while True:
        index = stream.find(query, start)
        if index == -1:
            break
        positions.append(index)
        start = index + 1

    if not positions:
        raise PdfEditError("Text not found on this page.", status=404)

    def record_range(stream_index: int) -> tuple[int, int]:
        begin = stream_to_record[stream_index]
        end = stream_to_record[stream_index + len(query) - 1]
        return begin, end + 1

    ranges = [record_range(position) for position in positions]

    if len(ranges) > 1:
        if approx_rect:
            target = pymupdf.Rect(approx_rect)
            best = min(
                ranges,
                key=lambda span: _match_distance(records, span[0], span[1], target),
            )
            return best
        raise PdfEditError(
            "Text occurs more than once on this page; a disambiguation "
            "rectangle is required.",
            status=409,
        )

    return ranges[0]


def _match_distance(
    records: list[_Char], start: int, length: int, target: pymupdf.Rect
) -> float:
    begin = next(
        (record for record in records[start : start + length] if record.bbox),
        records[start],
    )
    finish = next(
        (
            record
            for record in reversed(records[start : start + length])
            if record.bbox
        ),
        begin,
    )
    center_x = (begin.bbox.x0 + finish.bbox.x1) / 2
    center_y = (begin.bbox.y0 + finish.bbox.y1) / 2
    return abs(center_x - target.x0) + abs(center_y - target.y0)


def _line_rects(records: list[_Char], start: int, end: int) -> list[pymupdf.Rect]:
    """Merge matched glyph bboxes per text line (y-band) into one rect each."""
    by_line: dict[tuple[float, float], pymupdf.Rect] = {}
    for record in records[start:end]:
        if record.bbox is None:
            continue
        y0 = round(record.bbox.y0)
        key = (y0, record.baseline)
        if key in by_line:
            by_line[key] |= record.bbox
        else:
            by_line[key] = pymupdf.Rect(record.bbox)
    return list(by_line.values())


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


def _font_tokens(font_name: str) -> set[str]:
    """Tokenize a font name, splitting camelCase and spaces."""
    import re

    spaced = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", font_name or "")
    return set(re.findall(r"[A-Za-z0-9]+", spaced))


def _embedded_font_buffer(page: pymupdf.Page, font_name: str) -> bytes | None:
    """Return the embedded font program for a span font, if available.

    Spans report the basefont name (camelCase, style words dropped),
    while page fonts use the resource name and full basefont, so a
    token-subset comparison is used.
    """
    span_tokens = _font_tokens(font_name)
    if not span_tokens:
        return None
    for xref, _ext, _ftype, basefont, name, _encoding in page.get_fonts():
        font_tokens = _font_tokens(f"{basefont} {name}")
        if not span_tokens.issubset(font_tokens):
            continue
        info = page.parent.extract_font(xref)
        buffer = info[3] if info else b""
        if buffer:
            return buffer
    return None


def _usable_font_buffer(
    page: pymupdf.Page, font_name: str, sample_text: str
) -> bytes | None:
    """Embedded font program that can actually re-render `sample_text`.

    Subset-embedded fonts (very common in real-world PDFs) often carry no
    unicode cmap, so re-inserting text through them produces NOTDEF
    glyphs. Such buffers are rejected here and the builtin fallback is
    used instead — the original document is never touched in that case.
    """
    buffer = _embedded_font_buffer(page, font_name)
    if not buffer:
        return None
    try:
        font = pymupdf.Font(fontbuffer=buffer)
        for char in set(sample_text):
            if char.isspace() or ord(char) > 0xFFFF:
                continue
            if not font.has_glyph(ord(char)):
                return None
    except Exception:  # noqa: BLE001 - treat unreadable buffers as unusable
        return None
    return buffer


def _measure_width(
    font_buffer: bytes | None, builtin: str, text: str, size: float
) -> float:
    try:
        if font_buffer:
            font = pymupdf.Font(fontbuffer=font_buffer)
        else:
            font = pymupdf.Font(fontname=builtin)
        return font.text_length(text, size)
    except Exception:  # noqa: BLE001 - measurement is best-effort
        return size * 0.5 * len(text)


def _alignment_shift(
    records: list[_Char],
    start: int,
    end: int,
    new_width: float,
) -> tuple[float, str]:
    """Return (x offset, alignment label) for the replacement.

    Conservative heuristic using the matched line's geometry captured
    before redaction: a clear trailing span becomes right-anchored, a
    near-symmetric span becomes centered, everything else stays
    left-anchored.
    """
    first = records[start]
    last = records[end - 1]
    line_rect = first.line or pymupdf.Rect(
        first.bbox.x0, first.bbox.y0, last.bbox.x1, last.bbox.y1
    )
    left_margin = first.bbox.x0 - line_rect.x0
    right_margin = line_rect.x1 - last.bbox.x1
    line_width = line_rect.width
    block_rect = first.block
    if block_rect and left_margin <= 0.5:
        # The span fills its line; use the block column for context.
        left_margin = first.bbox.x0 - block_rect.x0
        right_margin = block_rect.x1 - last.bbox.x1
        line_width = block_rect.width
    if (
        left_margin > line_width * 0.25
        and right_margin < 2.0
        and new_width <= line_width
    ):
        return last.bbox.x1 - new_width - first.bbox.x0, "right"
    if abs(left_margin - right_margin) < 4.0 and new_width <= line_width:
        return (left_margin - right_margin) / 2, "center"
    return 0.0, "left"


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

    query = _normalize_text(original_text)
    if not query:
        raise PdfEditError("Original text contains no matchable characters.")

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

        records = _page_char_stream(page)
        start, end = _find_matches(records, query, approx_rect)

        first = records[start]
        font_name = first.font
        font_size = first.size
        color = first.color
        baseline = first.baseline

        # Capture the embedded font program before redaction may prune it.
        # Subset fonts without a unicode cmap are rejected so replacement
        # text never renders as NOTDEF glyphs.
        font_buffer = _usable_font_buffer(page, font_name, replacement_text)
        builtin = _to_builtin_font(font_name)

        line_rects = _line_rects(records, start, end)
        for rect in line_rects:
            page.add_redact_annot(rect, fill=None)
        page.apply_redactions()

        if replacement_text:
            reused_name: str | None = None
            if font_buffer:
                reused_name = f"RamEdit{random.randint(10000, 99999)}"
                try:
                    page.insert_font(fontname=reused_name, fontbuffer=font_buffer)
                except Exception:  # noqa: BLE001 - fall back to builtin
                    reused_name = None

            insert_font = reused_name or builtin
            new_width = _measure_width(
                font_buffer if reused_name else None, builtin, replacement_text, font_size
            )
            shift, _alignment = _alignment_shift(records, start, end, new_width)
            x = first.bbox.x0 + shift

            page.insert_text(
                (x, baseline),
                replacement_text,
                fontsize=font_size,
                color=_hex_color_to_tuple(color),
                fontname=insert_font,
            )

        result = doc.tobytes(garbage=3, deflate=True)
    except PdfEditError:
        raise
    except Exception as exc:  # noqa: BLE001 - surface unexpected failures cleanly
        raise PdfEditError(f"Text replacement failed: {exc}", status=500) from exc
    finally:
        doc.close()

    return result


def _anchor_raw_text(records: list[_Char], start: int, end: int) -> str:
    """Raw (pre-normalization) text of a matched record range."""
    return "".join(record.raw for record in records[start:end] if record.raw is not None)


def _line_records(records: list[_Char], line_rect: pymupdf.Rect) -> list[_Char]:
    """All non-synthetic records belonging to one text line.

    Lines are matched by their full bounding box (not just baseline) so
    sibling lines that share a vertical band — e.g. a left label and a
    right-aligned run in the same block — stay separate.
    """
    return [
        record
        for record in records
        if record.raw is not None
        and record.line is not None
        and abs(record.line.x0 - line_rect.x0) <= 0.5
        and abs(record.line.x1 - line_rect.x1) <= 0.5
        and abs(record.line.y1 - line_rect.y1) <= 0.5
    ]


def _insertion_point(records: list[_Char], start: int, end: int, raw_offset: int) -> float:
    """X coordinate of the raw character at `raw_offset` inside the match.

    Offset 0 is the match start; an offset at or past the match end is
    the match's right edge.
    """
    consumed = 0
    for record in records[start:end]:
        if record.raw is None:
            continue
        if raw_offset <= consumed:
            return record.bbox.x0
        consumed += 1
    return records[end - 1].bbox.x1


def insert_text_into_pdf(
    data: bytes,
    page_index: int,
    anchor_text: str,
    offset_in_anchor: int,
    insertion_text: str,
    approx_rect: tuple[float, float, float, float] | None = None,
) -> bytes:
    """Insert `insertion_text` into an existing text line of a PDF page.

    The anchor text is located with the same character-level matching as
    replacement (ligature/soft-hyphen aware, repeated-text safe). The
    insertion point is `offset_in_anchor` raw characters into the anchor
    (0 = before the anchor, anchor length = after it).

    Two safe strategies are used, never a destructive guess:

    1. Inline: when the insertion fits in the free space on the line, the
       text is drawn directly at the insertion point with the anchor's
       font, size, color and baseline (embedded fonts reused).
    2. Single-line rebuild: when the line has no room but is uniform
       (one font/size/color, no overlapping images), the whole line is
       re-set with the insertion spliced in — equivalent to replacing
       the line's own text with its edited content.

    Otherwise the request fails with 409 and a clear message; no
    unrelated glyphs are ever removed.
    """
    if not data or len(data) < MIN_PDF_BYTES:
        raise PdfEditError("Empty or truncated PDF data.")
    if data[:4] != b"%PDF":
        raise PdfEditError("File is not a PDF.", status=422)
    if page_index < 0:
        raise PdfEditError("Page index must be zero or greater.")
    if not anchor_text or not anchor_text.strip():
        raise PdfEditError("Anchor text must not be empty.")
    if len(anchor_text) > MAX_ORIGINAL_TEXT_LENGTH:
        raise PdfEditError("Anchor text is too long.", status=413)
    if not insertion_text.strip():
        raise PdfEditError("Insertion text must not be empty.", status=422)
    if len(insertion_text) > MAX_REPLACEMENT_TEXT_LENGTH:
        raise PdfEditError("Insertion text is too long.", status=413)
    if offset_in_anchor < 0:
        raise PdfEditError("Insertion offset must be zero or greater.", status=422)

    query = _normalize_text(anchor_text)
    if not query:
        raise PdfEditError("Anchor text contains no matchable characters.")

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

        records = _page_char_stream(page)
        start, end = _find_matches(records, query, approx_rect)

        anchor_raw = _anchor_raw_text(records, start, end)
        if offset_in_anchor > len(anchor_raw):
            raise PdfEditError(
                "Insertion offset is beyond the anchor text.", status=422
            )

        first = records[start]
        font_name = first.font
        font_size = first.size
        color = first.color
        baseline = first.baseline
        # Reusable only when the buffer can render the text to be inserted
        # (subset fonts without a unicode cmap would produce NOTDEF glyphs).
        font_buffer = _usable_font_buffer(page, font_name, insertion_text)
        builtin = _to_builtin_font(font_name)

        point_x = _insertion_point(records, start, end, offset_in_anchor)
        new_width = _measure_width(font_buffer, builtin, insertion_text, font_size)

        line_rect = first.line or pymupdf.Rect(
            first.bbox.x0, first.bbox.y0, records[end - 1].bbox.x1, records[end - 1].bbox.y1
        )
        # The nearest glyph the insertion could collide with: the anchor's
        # own character at the insertion point (offset inside the anchor),
        # the first glyph after the anchor on the same line, or the line end.
        next_x = line_rect.x1
        if offset_in_anchor < len(anchor_raw):
            next_x = _insertion_point(records, start, end, offset_in_anchor)
        else:
            for record in records[end:]:
                if record.raw is None or record.line is None:
                    continue
                if abs(record.baseline - baseline) > 0.5:
                    continue
                next_x = min(next_x, record.bbox.x0)
                break

        rebuilt = None
        if point_x + new_width > next_x + 1.0:
            rebuilt = _rebuild_line_text(
                page, records, start, end, offset_in_anchor, insertion_text
            )
            if rebuilt is not None:
                _, rebuilt_width = rebuilt
                page_width = page.rect.width
                if line_rect.x0 + rebuilt_width > page_width - 1.0:
                    raise PdfEditError(
                        "The inserted text would exceed the page width.",
                        status=409,
                    )
            else:
                raise PdfEditError(
                    "Not enough room on this line to insert without overlapping "
                    "existing text, and the line cannot be safely re-set.",
                    status=409,
                )

        if rebuilt is not None:
            line_text, _ = rebuilt
            page.add_redact_annot(line_rect, fill=None)
            page.apply_redactions()

        reused_name: str | None = None
        if font_buffer:
            reused_name = f"RamEdit{random.randint(10000, 99999)}"
            try:
                page.insert_font(fontname=reused_name, fontbuffer=font_buffer)
            except Exception:  # noqa: BLE001 - fall back to builtin
                reused_name = None

        insert_font = reused_name or builtin
        if rebuilt is not None:
            x = line_rect.x0
            text = line_text
        else:
            x = point_x
            text = insertion_text

        page.insert_text(
            (x, baseline),
            text,
            fontsize=font_size,
            color=_hex_color_to_tuple(color),
            fontname=insert_font,
        )

        result = doc.tobytes(garbage=3, deflate=True)
    except PdfEditError:
        raise
    except Exception as exc:  # noqa: BLE001 - surface unexpected failures cleanly
        raise PdfEditError(f"Text insertion failed: {exc}", status=500) from exc
    finally:
        doc.close()

    return result


def _rebuild_line_text(
    page: pymupdf.Page,
    records: list[_Char],
    start: int,
    end: int,
    offset_in_anchor: int,
    insertion_text: str,
) -> tuple[str, float] | None:
    """Splice the insertion into the anchor's line for a safe re-set.

    Returns (rebuilt raw line text, measured width) when the line is a
    single uniform text run (one font, size and color) with no image
    overlap; otherwise None. No unrelated glyphs are touched by callers
    of this function.
    """
    first = records[start]
    line_rect = first.line
    if line_rect is None:
        return None
    line_recs = _line_records(records, line_rect)
    if not line_recs:
        return None

    font_name = line_recs[0].font
    font_size = line_recs[0].size
    color = line_recs[0].color
    for record in line_recs:
        if (
            record.font != font_name
            or abs(record.size - font_size) > 0.01
            or record.color != color
        ):
            return None
        if record.bbox is None or not line_rect.contains(record.bbox):
            return None

    # Never re-set a line that overlaps an image: redaction would remove
    # pixels the re-inserted text cannot restore.
    for info in page.get_image_info():
        if line_rect.intersects(pymupdf.Rect(info["bbox"])):
            return None

    line_text = "".join(record.raw for record in line_recs)
    anchor_index = None
    for index, record in enumerate(line_recs):
        if record is records[start]:
            anchor_index = index
            break
    if anchor_index is None:
        return None
    splice_at = anchor_index + offset_in_anchor
    rebuilt = line_text[:splice_at] + insertion_text + line_text[splice_at:]
    width = _measure_width(
        _usable_font_buffer(page, font_name, rebuilt),
        _to_builtin_font(font_name),
        rebuilt,
        font_size,
    )
    return rebuilt, width
