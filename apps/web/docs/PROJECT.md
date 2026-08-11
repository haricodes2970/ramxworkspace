# RamxWorkspace

RamxWorkspace is a self-hosted, privacy-first document workspace. The long-term product direction is a browser-based workspace for PDFs, Word documents, Excel sheets, PowerPoint decks, images, and future AI-assisted document tools.

This repository implements Phase 1 Foundation, Phase 2 (client-side PDF viewer), Phase 3 (annotation engine), Phase 4 (page operations), Phase 5 (PDF export), Phase 6 (UX polish and keyboard shortcuts), Phase 7 (production Docker deployment and self-hosting), and Phase 8 (final MVP release validation). No backend, no document uploads to third-party services: all PDF parsing, rendering and export happens locally in the browser.

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Zustand
- Lucide React
- PDF.js (viewing/rendering/search)
- pdf-lib (client-side export)
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
    pdf/                Phases 2-6 client-side PDF viewer, annotation
                        engine, page operations, pdf-lib export and UX
                        polish (uploader, viewer, thumbnails, search,
                        annotation overlay/tools/stores, page identity
                        store, export service, keyboard shortcuts, libs)
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

## Self-Hosting (Docker)

RamxWorkspace is designed to be self-hosted with a single command.

### Requirements

- Docker Engine (with Docker Compose v2)
- A free TCP port (default: `3000`)

### Quick start

```bash
git clone https://github.com/haricodes2970/ramxworkspace.git
cd ramxworkspace
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000).

The image builds itself locally on first run — no registry account or
configuration is required.

### Configuration

The application works with zero configuration. The only optional values
(used for the in-app name and stage label) live in `docker-compose.yml`
under `environment:` and can be edited before starting:

```txt
NEXT_PUBLIC_APP_NAME=RamxWorkspace
NEXT_PUBLIC_APP_STAGE=production
```

`.env.example` documents the same variables for local (non-Docker)
development. Never commit `.env` or `.env.local` files; they are
git-ignored.

### Daily operations

```bash
docker compose logs -f        # view logs
docker compose down           # stop the application
docker compose up -d          # start it again
docker compose up -d --build  # rebuild after code changes
git pull                      # update the source, then rebuild (above)
```

### Troubleshooting

| Symptom                               | Fix                                                                                                                             |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `port is already allocated`           | Port 3000 is in use. Change the `ports:` mapping in `docker-compose.yml` (e.g. `"8080:3000"`) and open `http://localhost:8080`. |
| `Cannot connect to the Docker daemon` | Start Docker (system tray / `systemctl start docker`), then retry.                                                              |
| Image build fails                     | Check the failing step in the build output. The deps stage needs network access to `registry.npmjs.org`.                        |
| Container runs but site unreachable   | `docker compose logs` and confirm the health check passes: `docker ps`.                                                         |
| PDF.js worker fails after an update   | Force a browser refresh (Ctrl+Shift+R) — the worker is served from the app, not a CDN.                                          |
| Application looks stale               | Browser cache. Hard-refresh or clear site data.                                                                                 |

### Deployment model

```txt
USER DEVICE
    ↓
BROWSER
    ↓
RAMXWORKSPACE CONTAINER
    ↓
STATIC / NEXT.JS APPLICATION
    ↓
PDF PROCESSED IN BROWSER
```

The container serves the application only. PDF.js parsing, rendering,
search, annotation and pdf-lib export all run in the visitor's browser.
The MVP requires no database, backend, cloud storage or third-party PDF
service, and PDF contents never leave the device running the browser.

### Image details

- Multi-stage build; runtime image contains only the production
  standalone output, static assets and `public/`
- Runs as a non-root user (`nextjs`, uid 1001)
- `tini` as PID 1 for clean signal handling
- Built-in HTTP health check against `/`
- No privileged mode, no Docker socket, no host mounts

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
- Phase 5: PDF export: client-side pdf-lib flattening of page order, deletion, rotation and all annotations (highlight, underline, strike-through, freehand, text boxes, sticky notes), filename customization, loading/error/success states, exported-file validation before download. ✅
- Phase 6: UX polish, accessibility refinement, keyboard shortcuts, performance refinement, loading/error polish. ✅
- Phase 7: Production deployment: hardened multi-stage Docker image (non-root, tini, health check), single-service Docker Compose, worker-safe standalone build, self-hosting and troubleshooting documentation. ✅
- Phase 8: Final MVP release validation: full workflow round-trip verification, export/password/edge-case testing, production container validation, documentation cleanup. ✅
- Future: Word, Excel, PowerPoint, images, offline-first workflows, and AI-powered document tools.

## MVP Scope and Limitations

RamxWorkspace MVP covers one document type (PDF) with the workflow:
open, view, search, annotate, edit pages, export, download.

Not included in the MVP (future work):

- Word, Excel, PowerPoint and image documents
- OCR (searching scanned pages)
- AI-assisted document tools
- Collaboration or multi-user editing
- Authentication, accounts or a storage backend
- Cloud synchronization or external PDF services
- Merging or splitting documents

The MVP is a single-user, single-document session: opening a new PDF
replaces the current working document. All processing stays on the
device running the browser.

## Privacy Stance

The MVP is designed to stay local-first. Document handling runs in the browser whenever possible (Phase 2 PDF viewer parses and renders entirely client-side via PDF.js), and no backend should be introduced until a later phase explicitly needs one.
