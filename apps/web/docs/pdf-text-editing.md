# PDF Text Editing — Architecture

How existing-PDF-text replacement works in RamSpace, why it is a hybrid
architecture, and how edits flow through selection → backend → undo →
export → save.

## Decision: Hybrid (client UI + our own backend)

Three approaches were evaluated with evidence before implementation:

| Approach | Result |
| --- | --- |
| A. Client overlay + whiteout | Rejected. The original text stays in the PDF content stream; hiding it with a white rectangle is fake editing and breaks on colored backgrounds, images and multi-column layouts. |
| B. pdf-lib content-stream editing | Rejected after verification. pdf-lib exposes no content-stream editing API — only `translateContent`, `scaleContent`, `drawText` and append-style `getContentStream`. It cannot remove or replace existing glyphs. |
| C. FastAPI + PyMuPDF | Chosen. Verified empirically: a fill-less redaction removes the target glyphs from the content stream while background graphics survive unchanged, and the replacement can be inserted at the original baseline with the original size, color and approximate font. |

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
5. Backend: locates the text with `search_for` (disambiguated by the
   approximate rect), redacts the span bounding box with `fill=None`
   (glyph removal, background preserved), and inserts the replacement at
   the original baseline with the span's font size and color, using a
   Standard-14 font mapping.
6. Client replaces `sourceBytes` with the returned PDF and reloads the
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
  match when a string occurs more than once.

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

- **Fonts**: the replacement uses a Standard-14 mapping (Helvetica,
  Times-Roman, Courier, Symbol, ZapfDingbats). Custom/embedded fonts are
  not reproduced; a fallback font is used at the original size and color.
- **Overlapping text**: redaction removes any glyph whose bounding box
  intersects the target rectangle. Text lines that overlap the target
  (e.g. tightly stacked lines or layered labels) can lose glyphs.
- **Alignment**: replacement is left-anchored at the original start
  position. Right/center-aligned text approximates position only.
- **Single selection**: the popover edits one selected string per apply.
  Multi-rect (multi-line) replacements work when the backend finds the
  string, but a dedicated multi-line edit UX is deferred.
- **Text-layer vs content differences**: the selected string must match
  the PDF's extractable text (ligatures, hyphenation and layout
  transformations may differ). Backend responds 404 with a clear message
  when no match is found.

## Backend contract

- `POST /pdf/edit-text` (multipart): `file`, `page` (0-based),
  `originalText`, `replacementText` (empty = delete), optional
  `rectX0/Y0/X1/Y1` disambiguation rect.
- Returns `application/pdf` with the modified document.
- Errors: `422` invalid PDF / malformed request, `404` missing page or
  text, `413` upload or replacement too large (30 MB upload cap).
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
