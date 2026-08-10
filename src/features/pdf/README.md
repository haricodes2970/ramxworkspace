# PDF Workspace

Client-side PDF viewer. Phase 2 of RamxWorkspace.

## Status

- [x] PDF.js worker setup
- [x] Viewer state store (Zustand, in-memory, not persisted)
- [ ] File upload (picker + drag/drop)
- [ ] Document loading + error handling
- [ ] Page rendering + continuous scroll
- [ ] Page navigation
- [ ] Zoom controls
- [ ] Thumbnails
- [ ] Text search

## Privacy

All parsing and rendering happens in the browser. No PDF data ever leaves
the client. No backend, no third-party document services.
