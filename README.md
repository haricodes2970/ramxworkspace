# RamxWorkspace

RamxWorkspace is a self-hosted, privacy-first document workspace. The long-term product direction is a browser-based workspace for PDFs, Word documents, Excel sheets, PowerPoint decks, images, and future AI-assisted document tools.

This repository currently implements Phase 1 Foundation only. It intentionally does not include PDF upload, PDF viewing, annotation tools, editing, export, backend APIs, authentication, database code, or PDF libraries.

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
  features/             Feature modules and future document areas
  lib/                  Shared runtime configuration and helpers
  store/                Zustand stores for theme and workspace UI only
  types/                Shared TypeScript domain types
public/                 Static assets
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

- Phase 1: Production-ready foundation, responsive shell, theme support, Docker setup.
- Phase 2: Client-side PDF viewer, upload flow, navigation, thumbnails, and PDF workspace basics.
- Phase 3: Annotation tools, page operations, recent files, and export workflow.
- Phase 4: Advanced PDF tools and optional self-hosted backend for heavy processing.
- Future: Word, Excel, PowerPoint, images, offline-first workflows, and AI-powered document tools.

## Privacy Stance

The MVP is designed to stay local-first. Document handling should run in the browser whenever possible, and no backend should be introduced until a later phase explicitly needs one.
