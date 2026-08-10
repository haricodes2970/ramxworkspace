# PDF Workspace

Client-side PDF viewer + annotation engine. Phases 2-3 of RamxWorkspace.

## Viewer status (Phase 2)

- [x] PDF.js worker setup
- [x] Viewer state store (Zustand, in-memory, not persisted)
- [x] File upload (picker + drag/drop)
- [x] Document loading + error handling
- [x] Page rendering + continuous scroll
- [x] Page navigation
- [x] Zoom controls (in/out/reset/fit-to-width)
- [x] Thumbnails (desktop panel + mobile drawer)
- [x] Text search (match count, next/prev, Ctrl+F)
- [x] Responsive viewer (auto fit-to-width under 640px)
- [x] Error/edge case handling (password, corrupted, race guards)

## Annotation status (Phase 3)

- [x] Typed page-specific model, page-fraction coordinates (zoom-safe)
- [x] Dedicated annotation store (tool, selection, bounded undo/redo)
- [x] Per-page overlay independent of PDF.js canvas rendering
- [x] Highlight (text selection capture)
- [x] Underline, strike-through
- [x] Freehand pen (pointer events, touch-safe)
- [x] Text boxes (tap to create, double-click to edit)
- [x] Sticky notes (tap to create, double-click to edit)
- [x] Selection, deletion (button, Delete/Backspace key)
- [x] Movement (drag draw/text/note with select tool)
- [x] Undo/redo (Ctrl+Z, Ctrl+Y, toolbar buttons)

## Privacy

All parsing and rendering happens in the browser. No PDF data ever leaves
the client. No backend, no third-party document services.

## Out of scope (later phases)

PDF export/save (pdf-lib), page operations, OCR, signatures, collaboration.
