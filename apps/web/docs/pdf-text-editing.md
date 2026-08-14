# PDF Text Editing — Architecture

How existing-PDF-text replacement works in RamSpace, why it is a hybrid
architecture, and how edits flow through selection → backend → undo →
export → save.

## Decision: Hybrid (client UI + our own backend)

Three approaches were evaluated with evidence before implementation:

| Approach                          | Result                                                                                                                                                                                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. Client overlay + whiteout      | Rejected. The original text stays in the PDF content stream; hiding it with a white rectangle is fake editing and breaks on colored backgrounds, images and multi-column layouts.                                                                                   |
| B. pdf-lib content-stream editing | Rejected after verification. pdf-lib exposes no content-stream editing API — only `translateContent`, `scaleContent`, `drawText` and append-style `getContentStream`. It cannot remove or replace existing glyphs.                                                  |
| C. FastAPI + PyMuPDF              | Chosen. Verified empirically: a fill-less redaction removes the target glyphs from the content stream while background graphics survive unchanged, and the replacement can be inserted at the original baseline with the original size, color and approximate font. |

Final architecture:

- **Client side** — text selection (corrected PDF.js text layer), Edit tool,
  replacement popover, geometry conversion, undo/redo, document reload.
- **Backend** — our own FastAPI + PyMuPDF service (`POST /pdf/edit-text`)
  performs the true content modification. PDFs never leave RamSpace
  infrastructure; no third-party APIs are involved.

## Edit flow

1. User activates the **Edit** tool (toolbar or `E`).
2. User selects existing text in the PDF.js text layer.
3. A popover appears showing the original text and a replacement input
   (empty replacement = delete).
4. Apply sends the current source PDF bytes plus
   `{ page, originalText, replacementText, rects }` to
   `POST {API_URL}/pdf/edit-text`.
5. Backend: locates the text with a character-level scan of the page's
   text structure (`get_text("rawdict")`), disambiguated by the
   approximate rect. Each matching glyph is redacted with `fill=None`
   (glyph removal, background preserved) using per-line merged bounding
   boxes, and the replacement is inserted at the original baseline with
   the original font size and color.
6. When the original span uses an embedded font, its font program is
   extracted and re-embedded (`extract_font` + `insert_font`), so the
   replacement renders in the true font. Otherwise a Standard-14
   equivalent is used.
7. Client replaces `sourceBytes` with the returned PDF and reloads the
   document — the viewer now renders genuine modified content.

## Selection model

- `page` — zero-based source page index.
- `originalText` — the exact selected string.
- `rects` — approximate PDF-space rectangles (bottom-left origin)
  converted from the selection's fraction rectangles via
  `fractionRectsToPdfRects` in `pdf-edit-request.ts`, mirroring the
  export geometry pipeline exactly (`fractionRectToPdfRect` with
  `totalRotation = baseRotation + userRotation`).
- Multi-rect selections are supported; the backend picks the closest
  match when a string occurs more than once. If the string occurs more
  than once and no rect is provided, the backend returns `409` instead
  of guessing.

## Text matching (fidelity)

Matching is character-level over the page's text structure, which keeps
the edit honest when the visual string differs from the raw glyphs:

- **Ligatures** (`fi`, `fl`, `ffi`, …) are decomposed to their ASCII
  sequences so a selection like "fire" matches glyph `ﬁ` + `re`.
- **Soft hyphens** (U+00AD) are dropped from both sides, so a
  "softword" selection matches a word that wraps with a discretionary
  hyphen.
- **Multi-line** selections are supported: lines are joined with a
  synthetic space, so "Alpha line one\nBeta line two" matches and
  removes both lines, then inserts one replacement at the first line's
  baseline.
- **Embedded fonts** are reused: the font program is extracted from the
  source PDF and re-embedded for the replacement (`insert_font`), giving
  true font fidelity instead of a fallback. Built-in (Standard-14)
  fonts fall back to their Helvetica/Times/Courier equivalents.
- **Alignment**: replacement is left-anchored by default; a clear
  trailing span becomes right-anchored and a near-symmetric span is
  centered, using line (and block) geometry captured before redaction.

## Undo / Redo

Text edits change the document bytes, so they cannot share the
annotation store's op-based history. The viewer store keeps a byte-level
history (`editHistory.past/future`, capped at 20 entries). The toolbar
buttons and `Ctrl+Z`/`Ctrl+Y`/`Ctrl+Shift+Z` shortcuts route through a
single dispatcher (`undoAction`/`redoAction` in `pdf-edit.ts`):
text edits undo first, annotation operations second. Undo restores the
previous bytes and reloads the document; redo reapplies them.

## Export / Cloud save

`buildExportedPdf` and `runCloudSave` consume `viewer.sourceBytes`
unchanged. After an edit, `sourceBytes` holds the backend-modified PDF,
so export and cloud save include the edit automatically. No changes to
the export pipeline or Supabase storage were required.

## Whiteout / background handling

Removal is true redaction, not a white rectangle:

- `add_redact_annot(rect, fill=None)` removes glyphs whose bounding
  boxes intersect the rectangle; underlying drawings (shaded boxes,
  images) remain visible.
- The pixel-level regression test verifies a colored background survives
  replacement byte-for-byte.

## Known limitations (honest)

- **Fonts**: embedded fonts are reproduced via font-program reuse; a
  fallback Standard-14 font is used when the source font is not embedded
  or not extractable. Metrics may differ slightly from the original
  glyphs (baseline, size and color are preserved exactly).
- **Overlapping text**: redaction removes any glyph whose bounding box
  intersects the per-line target rectangle. Tightly stacked lines are
  safe (each matched line gets its own rect), but glyphs that physically
  overlap the matched text on the same line can still be lost.
- **Alignment**: right/center anchoring is a conservative heuristic
  (trailing-span or near-symmetric lines). Standalone lines with no
  column context stay left-anchored.
- **Single selection**: the popover edits one selected string per apply.
  Multi-line replacements are supported when the selection spans lines,
  but a dedicated multi-line edit UX is deferred.
- **Text-layer vs content differences**: the selected string must match
  the PDF's extractable text (ligatures, hyphenation and layout
  transformations may differ). Backend responds 404 with a clear message
  when no match is found, and 409 when a repeated string needs a
  disambiguation rect.

## Backend contract

- `POST /pdf/edit-text` (multipart): `file`, `page` (0-based),
  `originalText`, `replacementText` (empty = delete), optional
  `rectX0/Y0/X1/Y1` disambiguation rect.
- Returns `application/pdf` with the modified document.
- Errors: `422` invalid PDF / malformed request, `404` missing page or
  text, `409` repeated text without a disambiguation rect, `413` upload
  or replacement too large (30 MB upload cap).
- The service processes documents entirely in memory; nothing is
  persisted on the backend.

## Guest behavior

The edit endpoint is unauthenticated (like the rest of the current
backend). Guests can edit text; the guest export limit is unaffected.

## Performance (241-page TrustNet PDF, 3.9 MB)

- Single replacement: ~0.27 s backend time.
- 25 sequential replacements: ~4.75 s total (~0.19 s each).
- Browser work is a full document reload after each apply; rendering is
  async and does not block the UI thread.
