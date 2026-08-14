"""Tests for the PDF text editing endpoint and service."""

import io
import pathlib

import pymupdf
from fastapi.testclient import TestClient

from app.main import app
from app.services.pdf_edit import MAX_REPLACEMENT_TEXT_LENGTH

client = TestClient(app)


def _make_pdf(pages: int = 2) -> bytes:
    doc = pymupdf.open()
    for index in range(pages):
        page = doc.new_page(width=612, height=792)
        page.insert_text((72, 720), "Hello world", fontsize=12)
        page.insert_text((72, 700), "Second line", fontsize=12)
        if index == 0:
            page.draw_rect(pymupdf.Rect(0, 40, 612, 160), color=(0.95, 0.93, 0.85), fill=(0.95, 0.93, 0.85))
            page.insert_text((90, 95), "on shaded", fontsize=12)
    return doc.tobytes()


def _replace(**overrides) -> dict:
    fields = {
        "page": "0",
        "originalText": "Hello world",
        "replacementText": "Edited text",
        "rectX0": "70",
        "rectY0": "60",
        "rectX1": "133",
        "rectY1": "77",
    }
    fields.update({k: str(v) for k, v in overrides.items()})
    return {
        "data": fields,
        "files": {"file": ("doc.pdf", _make_pdf(), "application/pdf")},
    }


def _post(**overrides) -> object:
    request = _replace(**overrides)
    return client.post("/pdf/edit-text", **request)


def test_replace_text_returns_modified_pdf():
    response = _post()
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")

    reopened = pymupdf.open(stream=io.BytesIO(response.content), filetype="pdf")
    text = reopened[0].get_text()
    assert "Edited text" in text
    assert "Hello world" not in text
    assert reopened.page_count == 2
    assert "Second line" in text
    assert "on shaded" in text


def test_empty_replacement_deletes_text():
    response = _post(replacementText="")
    assert response.status_code == 200
    reopened = pymupdf.open(stream=io.BytesIO(response.content), filetype="pdf")
    assert "Hello world" not in reopened[0].get_text()
    assert "Second line" in reopened[0].get_text()


def test_background_is_preserved_after_redaction():
    response = _post()
    assert response.status_code == 200
    reopened = pymupdf.open(stream=io.BytesIO(response.content), filetype="pdf")
    page = reopened[0]
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
    # sample inside the previous "Hello world" bbox, below the replacement
    sample = (int(100 * 2), int(65 * 2))
    row = sample[1] * pixmap.stride
    r, g, b = pixmap.samples[row + sample[0] * pixmap.n : row + sample[0] * pixmap.n + 3]
    assert (r, g, b) == (242, 237, 216), f"background not preserved: {(r, g, b)}"


def test_replacement_preserves_size_and_color():
    response = _post()
    assert response.status_code == 200
    reopened = pymupdf.open(stream=io.BytesIO(response.content), filetype="pdf")
    for block in reopened[0].get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if span["text"] == "Edited text":
                    assert span["size"] == 12.0
                    assert span["color"] == 0
                    return
    raise AssertionError("replacement span not found")


def test_other_pages_untouched():
    response = _post(page="0")
    assert response.status_code == 200
    reopened = pymupdf.open(stream=io.BytesIO(response.content), filetype="pdf")
    assert "Hello world" in reopened[1].get_text()


def test_edit_second_page():
    response = _post(page="1")
    assert response.status_code == 200
    reopened = pymupdf.open(stream=io.BytesIO(response.content), filetype="pdf")
    assert "Edited text" in reopened[1].get_text()
    assert "Hello world" in reopened[0].get_text()


def test_invalid_pdf_rejected():
    response = client.post(
        "/pdf/edit-text",
        data={"page": "0", "originalText": "Hello world", "replacementText": "x"},
        files={"file": ("doc.pdf", b"not a pdf at all", "application/pdf")},
    )
    assert response.status_code == 422


def test_empty_pdf_rejected():
    response = client.post(
        "/pdf/edit-text",
        data={"page": "0", "originalText": "Hello world", "replacementText": "x"},
        files={"file": ("doc.pdf", b"", "application/pdf")},
    )
    assert response.status_code == 413


def test_missing_page_rejected():
    response = _post(page="9")
    assert response.status_code == 404


def test_text_not_found_rejected():
    response = _post(originalText="No such phrase here")
    assert response.status_code == 404


def test_negative_page_rejected():
    response = _post(page="-1")
    assert response.status_code == 422


def test_empty_original_text_rejected():
    response = _post(originalText="")
    assert response.status_code == 422


def test_oversized_replacement_rejected():
    response = _post(replacementText="x" * (MAX_REPLACEMENT_TEXT_LENGTH + 1))
    assert response.status_code == 422


def test_rect_disambiguates_repeated_occurrences():
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)
    page.insert_text((72, 720), "Hello world", fontsize=12)
    page.insert_text((72, 680), "Hello world", fontsize=12)
    pdf_bytes = doc.tobytes()

    data = {k: v for k, v in _replace().items() if k != "files"}["data"]
    data = dict(data)
    data["rectY0"] = "661"
    data["rectY1"] = "678"
    response = client.post(
        "/pdf/edit-text",
        data=data,
        files={"file": ("doc.pdf", pdf_bytes, "application/pdf")},
    )
    assert response.status_code == 200
    reopened = pymupdf.open(stream=io.BytesIO(response.content), filetype="pdf")
    text = reopened[0].get_text()
    assert "Edited text" in text
    assert "Hello world" in text  # top occurrence remains
    # ensure the edit happened on the lower line
    y_of_replacement = None
    for block in reopened[0].get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                if span["text"] == "Edited text":
                    y_of_replacement = span["origin"][1]
    assert y_of_replacement is not None
    assert abs(y_of_replacement - 680) < 2


def test_oversized_upload_rejected():
    big = b"%PDF" + b"0" * (30 * 1024 * 1024)
    response = client.post(
        "/pdf/edit-text",
        data={"page": "0", "originalText": "Hello world", "replacementText": "x"},
        files={"file": ("doc.pdf", big, "application/pdf")},
    )
    assert response.status_code == 413


# ---------------------------------------------------------------------------
# Phase 6.7 regression suite: multi-line, fonts, ligatures, rotation,
# alignment, and redaction safety. Uses the committed embedded-font fixture.
# ---------------------------------------------------------------------------

_FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "embedded-font.pdf"


def _fixture_pdf() -> bytes:
    return _FIXTURE.read_bytes()


def _fixture_post(**overrides) -> object:
    data = {
        "page": "0",
        "originalText": "Alpha line one",
        "replacementText": "Changed alpha",
    }
    data.update({k: str(v) for k, v in overrides.items()})
    return client.post(
        "/pdf/edit-text",
        data=data,
        files={"file": ("doc.pdf", _fixture_pdf(), "application/pdf")},
    )


def _spans(pdf_bytes: bytes) -> list[tuple[str, dict]]:
    doc = pymupdf.open(stream=io.BytesIO(pdf_bytes), filetype="pdf")
    spans = []
    for block in doc[0].get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                spans.append((span["text"], span))
    doc.close()
    return spans


def _span_by_text(pdf_bytes: bytes, text: str) -> dict:
    for span_text, span in _spans(pdf_bytes):
        if span_text == text:
            return span
    raise AssertionError(f"span {text!r} not found")


def test_multi_line_replacement_replaces_both_lines():
    response = _fixture_post(
        originalText="Alpha line one\nBeta line two",
        replacementText="Merged replacement",
    )
    assert response.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(response.content))[0].get_text()
    assert "Merged replacement" in text
    assert "Alpha line one" not in text
    assert "Beta line two" not in text


def test_multi_line_deletion_removes_both_lines():
    response = _fixture_post(
        originalText="Alpha line one\nBeta line two", replacementText=""
    )
    assert response.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(response.content))[0].get_text()
    assert "Alpha line one" not in text
    assert "Beta line two" not in text
    assert "office effect" in text


def test_page_rotation_preserved_at_all_angles():
    for rotation in (0, 90, 180, 270):
        doc = pymupdf.open(stream=io.BytesIO(_fixture_pdf()))
        doc[0].set_rotation(rotation)
        rotated = doc.tobytes()
        doc.close()
        response = client.post(
            "/pdf/edit-text",
            data={
                "page": "0",
                "originalText": "Alpha line one",
                "replacementText": "Rotated edit",
            },
            files={"file": ("doc.pdf", rotated, "application/pdf")},
        )
        assert response.status_code == 200, f"rotation {rotation} failed"
        reopened = pymupdf.open(stream=io.BytesIO(response.content))
        assert reopened[0].rotation == rotation
        text = reopened[0].get_text()
        assert "Rotated edit" in text
        assert "Alpha line one" not in text
        reopened.close()


def test_embedded_font_is_reused_for_replacement():
    response = _fixture_post(originalText="office effect", replacementText="changed text")
    assert response.status_code == 200
    span = _span_by_text(response.content, "changed text")
    assert "Liberation" in span["font"] or "LiberationSans" in span["font"]
    doc = pymupdf.open(stream=io.BytesIO(response.content))
    extensions = {entry[1] for entry in doc[0].get_fonts()}
    assert "ttf" in extensions
    doc.close()


def test_replacement_preserves_size_color_and_baseline():
    response = _fixture_post(originalText="office effect", replacementText="changed text")
    assert response.status_code == 200
    original = _span_by_text(_fixture_pdf(), "office effect")
    span = _span_by_text(response.content, "changed text")
    assert span["size"] == original["size"]
    assert span["color"] == original["color"]
    assert abs(span["origin"][1] - original["origin"][1]) < 1.0


def test_unrelated_glyphs_and_fonts_survive_redaction():
    response = _fixture_post(originalText="office effect", replacementText="changed text")
    assert response.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(response.content))[0].get_text()
    assert "Beta line two" in text
    assert "Repeat this line" in text
    assert "Tight two" in text
    doc = pymupdf.open(stream=io.BytesIO(response.content))
    font_names = {entry[4] for entry in doc[0].get_fonts()}
    assert "Lib" in font_names
    doc.close()


def test_tight_neighbor_line_is_not_clipped():
    response = _fixture_post(originalText="Tight one", replacementText="T1")
    assert response.status_code == 200
    before = _span_by_text(_fixture_pdf(), "Tight two")
    after = _span_by_text(response.content, "Tight two")
    assert [round(v, 1) for v in before["bbox"]] == [round(v, 1) for v in after["bbox"]]


def test_redaction_keeps_background_pixels():
    response = _fixture_post(originalText="office effect", replacementText="changed text")
    assert response.status_code == 200
    page = pymupdf.open(stream=io.BytesIO(response.content))[0]
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
    x, y = int(80 * 2), int(728 * 2)
    offset = y * pixmap.stride + x * pixmap.n
    r, g, b = pixmap.samples[offset : offset + 3]
    assert (r, g, b) == (255, 255, 255), f"background damaged: {(r, g, b)}"


def test_repeated_block_rect_disambiguates_bottom_occurrence():
    response = _fixture_post(
        originalText="Repeat this line",
        replacementText="Repeat edited",
        rectX0="70",
        rectY0="548",
        rectX1="160",
        rectY1="565",
    )
    assert response.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(response.content))[0].get_text()
    assert "Repeat edited" in text
    assert "Repeat this line" in text
    span = _span_by_text(response.content, "Repeat edited")
    assert abs(span["origin"][1] - 560) < 2


def test_repeated_block_without_rect_conflicts():
    response = _fixture_post(originalText="Repeat this line")
    assert response.status_code == 409


def test_ligature_glyph_replacement():
    response = _fixture_post(originalText="fire", replacementText="flare")
    assert response.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(response.content))[0].get_text()
    assert "flare" in text
    assert "fire" not in text


def test_soft_hyphen_word_replacement():
    response = _fixture_post(originalText="softword", replacementText="soword")
    assert response.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(response.content))[0].get_text()
    assert "soword" in text
    assert "softword" not in text
    assert "soft-word" not in text


def test_right_aligned_replacement_stays_right_anchored():
    response = _fixture_post(originalText="right side", replacementText="rs")
    assert response.status_code == 200
    original = _span_by_text(_fixture_pdf(), "right side")
    span = _span_by_text(response.content, "rs")
    assert round(span["bbox"][2], 1) == round(original["bbox"][2], 1)


def test_edited_pdf_remains_editable():
    first = _fixture_post(
        originalText="Alpha line one\nBeta line two",
        replacementText="Merged replacement",
    )
    assert first.status_code == 200
    second = client.post(
        "/pdf/edit-text",
        data={
            "page": "0",
            "originalText": "Merged replacement",
            "replacementText": "Again edited",
        },
        files={"file": ("doc.pdf", first.content, "application/pdf")},
    )
    assert second.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(second.content))[0].get_text()
    assert "Again edited" in text
    assert "Merged replacement" not in text


# ---------------------------------------------------------------------------
# Phase 6.8: real text insertion.
# ---------------------------------------------------------------------------

def _fixture_insert(**overrides) -> object:
    data = {
        "page": "0",
        "anchorText": "Beta line two",
        "offsetInAnchor": "0",
        "insertionText": "beautiful ",
    }
    data.update({k: str(v) for k, v in overrides.items()})
    return client.post(
        "/pdf/insert-text",
        data=data,
        files={"file": ("doc.pdf", _fixture_pdf(), "application/pdf")},
    )


def _words(pdf_bytes: bytes) -> list[tuple[float, float, float, float, str]]:
    doc = pymupdf.open(stream=io.BytesIO(pdf_bytes), filetype="pdf")
    words = [(w[0], w[1], w[2], w[3], w[4]) for w in doc[0].get_text("words")]
    doc.close()
    return words


def test_insert_text_at_line_start_rebuilds_line():
    response = _fixture_insert()
    assert response.status_code == 200
    words = _words(response.content)
    beautiful = next(w for w in words if w[4] == "beautiful")
    beta = next(w for w in words if w[4] == "Beta")
    assert beautiful[0] < beta[0]  # rendered before the original line start
    assert abs(beautiful[1] - beta[1]) < 0.5  # same baseline
    assert abs(beautiful[0] - 72) < 1.0  # at the line start


def test_insert_text_inline_between_words():
    response = _fixture_insert(
        anchorText="Alpha line one", offsetInAnchor="6", insertionText="NEW "
    )
    assert response.status_code == 200
    words = _words(response.content)
    alpha = next(w for w in words if w[4] == "Alpha")
    new = next(w for w in words if w[4] == "NEW")
    line_word = next(w for w in words if w[4] == "line" and abs(w[1] - alpha[1]) < 0.5)
    assert abs(new[1] - alpha[1]) < 0.5  # same baseline
    assert alpha[2] <= new[0] and new[2] <= line_word[0]  # between the words


def test_insert_text_at_anchor_end_inline():
    response = _fixture_insert(
        anchorText="office effect", offsetInAnchor="13", insertionText=" inserted"
    )
    assert response.status_code == 200
    words = _words(response.content)
    inserted = next(w for w in words if w[4] == "inserted")
    effect = next(w for w in words if w[4] == "effect")
    assert abs(inserted[1] - effect[1]) < 0.5
    assert inserted[0] >= effect[2] - 1.0  # directly after the anchor


def test_insert_text_preserves_font_size_color_baseline():
    response = _fixture_insert(anchorText="Alpha line one", offsetInAnchor="5", insertionText="X ")
    assert response.status_code == 200
    doc = pymupdf.open(stream=io.BytesIO(response.content))
    spans = []
    for block in doc[0].get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                spans.append(span)
    original = _span_by_text(_fixture_pdf(), "Alpha line one")
    x_span = next(s for s in spans if "X" in s["text"])
    assert x_span["size"] == original["size"]
    assert x_span["color"] == original["color"]
    assert abs(x_span["origin"][1] - original["origin"][1]) < 1.0
    assert "Liberation" in x_span["font"]
    doc.close()


def test_insert_text_rotation_preserved():
    for rotation in (0, 90, 180, 270):
        doc = pymupdf.open(stream=io.BytesIO(_fixture_pdf()))
        doc[0].set_rotation(rotation)
        rotated = doc.tobytes()
        doc.close()
        response = client.post(
            "/pdf/insert-text",
            data={
                "page": "0",
                "anchorText": "Alpha line one",
                "offsetInAnchor": "5",
                "insertionText": "Z ",
            },
            files={"file": ("doc.pdf", rotated, "application/pdf")},
        )
        assert response.status_code == 200, f"rotation {rotation} failed"
        reopened = pymupdf.open(stream=io.BytesIO(response.content))
        assert reopened[0].rotation == rotation
        assert "Z" in reopened[0].get_text()
        reopened.close()


def test_insert_text_ambiguous_anchor_conflicts():
    response = _fixture_insert(anchorText="Repeat this line")
    assert response.status_code == 409


def test_insert_text_ambiguous_anchor_rect_disambiguates():
    response = _fixture_insert(
        anchorText="Repeat this line",
        insertionText="X ",
        rectX0="70",
        rectY0="548",
        rectX1="160",
        rectY1="565",
    )
    assert response.status_code == 200
    words = _words(response.content)
    hits = [w for w in words if w[4] == "X"]
    assert len(hits) == 1
    assert abs(hits[0][1] - 549.1) < 2  # lower occurrence (y0 549.1)


def test_insert_text_missing_anchor_rejected():
    response = _fixture_insert(anchorText="No such phrase here")
    assert response.status_code == 404


def test_insert_text_invalid_page_rejected():
    response = _fixture_insert(page="9")
    assert response.status_code == 404


def test_insert_text_empty_insertion_rejected():
    response = _fixture_insert(insertionText="")
    assert response.status_code == 422


def test_insert_text_offset_beyond_anchor_rejected():
    response = _fixture_insert(anchorText="Beta line two", offsetInAnchor="999")
    assert response.status_code == 422


def test_insert_text_invalid_pdf_rejected():
    response = client.post(
        "/pdf/insert-text",
        data={"page": "0", "anchorText": "x", "offsetInAnchor": "0", "insertionText": "y"},
        files={"file": ("doc.pdf", b"not a pdf at all", "application/pdf")},
    )
    assert response.status_code == 422


def test_insert_text_oversized_upload_rejected():
    big = b"%PDF" + b"0" * (30 * 1024 * 1024)
    response = client.post(
        "/pdf/insert-text",
        data={"page": "0", "anchorText": "x", "offsetInAnchor": "0", "insertionText": "y"},
        files={"file": ("doc.pdf", big, "application/pdf")},
    )
    assert response.status_code == 413


def test_insert_text_rebuilds_tight_line_safely():
    response = _fixture_insert(
        anchorText="Tight one", offsetInAnchor="5", insertionText=" and more "
    )
    assert response.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(response.content))[0].get_text()
    assert "Tight and more  one" in text.replace("\n", " ")
    assert "Tight two" in text  # neighbor intact


def test_insert_text_insufficient_room_rejected_without_corruption():
    # "right side" ends flush at the line edge; a long insertion cannot fit
    response = _fixture_insert(
        anchorText="right side",
        offsetInAnchor="10",
        insertionText=" with a very long tail of extra words here",
    )
    assert response.status_code == 409
    text = pymupdf.open(stream=io.BytesIO(_fixture_pdf()))[0].get_text()
    assert "right side" in text  # untouched
    assert "Chapter 1" in text


def test_insert_then_edit_round_trip():
    inserted = _fixture_insert(
        anchorText="Beta line two", offsetInAnchor="5", insertionText="beautiful "
    )
    assert inserted.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(inserted.content))[0].get_text()
    assert "Beta beautiful line two" in text.replace("\n", " ")
    edited = client.post(
        "/pdf/edit-text",
        data={
            "page": "0",
            "originalText": "Beta beautiful line two",
            "replacementText": "edited line",
        },
        files={"file": ("doc.pdf", inserted.content, "application/pdf")},
    )
    assert edited.status_code == 200
    text = pymupdf.open(stream=io.BytesIO(edited.content))[0].get_text()
    assert "edited line" in text
    assert "beautiful" not in text