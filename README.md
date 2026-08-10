# RamxWorkspace

RamxWorkspace is a self-hosted, privacy-first document workspace. The long-term product direction is a browser-based workspace for PDFs, Word documents, Excel sheets, PowerPoint decks, images, and future AI-assisted document tools.

This repository implements Phase 1 Foundation, Phase 2 (client-side PDF viewer), Phase 3 (annotation engine), and Phase 4 (page operations). No backend, no document uploads to third-party services: all PDF parsing and rendering happens locally in the browser.

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Zustand
- Lucide React
- ESLint
- Prettier
- Docker and Docker Compose

## Folder Structure

```txt
src/
  app/                  App Router entry points and global styles
  components/
    layout/             Application shell, header, sidebar, theme controls
    providers/          Root providers for theme and UI primitives
    ui/                 shadcn/ui primitives owned by this codebase
  features/
    pdf/                Phases 2-4 client-side PDF viewer, annotation
                        engine and page operations (uploader, viewer,
                        thumbnails, search, annotation overlay/tools/
                        stores, page identity store, libs)
  lib/                  Shared runtime configuration and helpers
  store/                Zustand stores for theme and workspace UI only
  types/                Shared TypeScript domain types
public/                 Static assets (incl. pdf.worker.min.mjs, copied by postinstall)
```

## Installation

```bash
npm install
cp .env.example .env.local
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality Checks

```bash
npm run lint
npm run type-check
npm run format:check
npm run build
```

## Docker

```bash
docker compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Environment Variables

```txt
NEXT_PUBLIC_APP_NAME=RamxWorkspace
NEXT_PUBLIC_APP_STAGE=local
```

## Roadmap

- Phase 1: Production-ready foundation, responsive shell, theme support, Docker setup. ✅
- Phase 2: Client-side PDF viewer: upload/drag-drop, multi-page continuous rendering, navigation, zoom, fit-to-width, thumbnails, text search (Ctrl+F), graceful error handling, mobile drawer. ✅
- Phase 3: Annotation engine: highlight, underline, strike-through, freehand pen, text boxes, sticky notes, selection, movement, editing, deletion, undo/redo (Ctrl+Z/Ctrl+Y), zoom-safe page-fraction coordinates, rotation-safe alignment. ✅
- Phase 4: Page operations: per-page rotation (90/180/270/back), page deletion with two-step confirmation and annotation cleanup, thumbnail drag-and-drop reordering with keyboard/move-button alternatives, stable page identity so annotations follow page content, viewer sync, single-page safety. ✅
- Phase 5: PDF export (pdf-lib).
- Future: Word, Excel, PowerPoint, images, offline-first workflows, and AI-powered document tools.

## Privacy Stance

The MVP is designed to stay local-first. Document handling runs in the browser whenever possible (Phase 2 PDF viewer parses and renders entirely client-side via PDF.js), and no backend should be introduced until a later phase explicitly needs one.
