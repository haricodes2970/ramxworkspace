# PDF Workspace

Client-side PDF viewer. Phase 2 of RamxWorkspace.

## Status

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

## Privacy

All parsing and rendering happens in the browser. No PDF data ever leaves
the client. No backend, no third-party document services.

## Out of scope (later phases)

Annotations, page operations, export/save, OCR, pdf-lib.
