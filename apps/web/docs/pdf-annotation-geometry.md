# PDF Annotation Geometry

## Canonical coordinate model

Annotations are stored as unit fractions (0..1) of the page's **display box at
user rotation 0** — i.e. the box reported by
`page.getViewport({ scale, rotation: 0 })`, with y increasing downward and the
origin at the top-left corner. Fractions are independent of zoom, container
width, and `devicePixelRatio`.

- **Create paths** (pen, text, note, text-selection rects) convert pointer
  events / `Range.getClientRects()` from client coordinates into fractions of
  the rotated display box, then apply the inverse user rotation before
  storing.
- **Render path** applies the current user rotation back
  (`transformAnnotation`) and draws into an SVG with `viewBox="0 0 100 100"`
  and `preserveAspectRatio="none"`, so `fraction × 100` maps 1:1.
- **Export path** applies the user rotation and converts into PDF MediaBox
  coordinates (bottom-left origin, y-up) using the combined rotation
  (source `/Rotate` + user rotation).

All three paths agree; the model itself is not the source of geometry bugs.

## Text-layer geometry (fixed 2026-08)

The text layer (`apps/web/src/features/pdf/lib/pdf-text-layer.ts`) places a
span per PDF.js text item. Rules:

1. **Font height** is derived from the composed transform
   `viewport.transform ∘ item.transform`:
   `fontHeight = hypot(tx[2], tx[3])`. `TextItem.height` is a length in PDF
   device space and is **never** fed back through the text matrix.
2. **Span box** for axis-aligned text:
   `left = tx[4]`, `top = tx[5] − fontHeight × ascentRatio`, where
   `ascentRatio` comes from the PDF font style (`styles[fontName].ascent`,
   default 0.8). Non-axis-aligned runs fall back to the corner bounding box.
3. **Horizontal scaling**: `scaleX = item.width / measuredCssWidth`, where
   `measuredCssWidth` is `canvas.measureText()` at `fontHeight` px using the
   item's resolved font family. The old em-ratio formula
   (`textWidth / fontHeight`) was incorrect and stretched spans ~5×.
4. **Fonts**: `fontName` is preserved from `getTextContent()` and resolved to
   `styles[fontName].fontFamily` (fallback `sans-serif`). No `@font-face`
   embedding; embedded PDF fonts whose CSS substitutes are unavailable render
   with the fallback, so small horizontal differences (≈5–10% per font) are
   possible. Full font fidelity is a follow-up concern.

## Compatibility with annotations created before the geometry fix

Annotations created before the 2026-08 text-layer fix may contain corrupted
rectangle coordinates, because the broken text layer produced selection
rectangles ~5× too wide and ~12× too tall (a 12pt text line could yield a
highlight covering most of the page). Such stored annotations were written
with the same fraction model, so they are internally consistent — but they
encode the corrupt rects.

- New annotations are correct.
- Existing annotations are **not** rewritten or migrated automatically.
- Annotations created before the fix may remain visually corrupted and
  require re-creation.
- A migration is not planned; revisit only if corrupted data is found in
  production documents.

## Verification

- `npm test` — geometry unit tests (node test runner, type-stripped TS).
- Geometry invariants are also exercised in headless Chrome DOM sweeps
  (span rect vs computed box across scales 0.5–2 and rotations 0°/90°/180°/270°).
