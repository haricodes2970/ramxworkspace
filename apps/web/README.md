# RamSpace Web

Next.js frontend of RamSpace — a privacy-first, client-side PDF
workspace (view, search, annotate, edit pages, export). All PDF
processing happens in the browser.

See [docs/PROJECT.md](docs/PROJECT.md) for the full project history,
feature details and architecture notes.

## Routes

| Route        | Purpose                                                                |
| ------------ | ---------------------------------------------------------------------- |
| `/`          | Landing page (marketing, hero, features, privacy, document types, CTA) |
| `/workspace` | Guest application shell with the PDF workspace                         |

## Guest mode

Visitors enter `/workspace` as guests — no login required. Guests get 3
free PDF exports, tracked locally in `localStorage` under
`ramspace-guest-export-count` (Zustand store:
`src/features/guest/guest-export-store.ts`). The count increments only
after a successful export; a fourth export attempt opens a conversion
dialog ("Create free account" — placeholder, authentication is not
implemented yet). Clearing browser data resets the counter; this is an
intentional Phase 1 limitation, not security enforcement.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Quality checks

```bash
npm run lint
npm run type-check
npm run format:check
npm run build
```

## Docker

```bash
docker compose up -d --build   # from the repository root
```

## Environment

Copy `apps/web/.env.example` values into your own `.env.local` when you
need to override the defaults. Only `.env.example` is committed.

| Variable                | Default                 | Purpose                                                                                                                        |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_APP_NAME`  | `RamxWorkspace`         | Brand name shown in the UI.                                                                                                    |
| `NEXT_PUBLIC_APP_STAGE` | `local`                 | Environment label.                                                                                                             |
| `NEXT_PUBLIC_API_URL`   | `http://localhost:8000` | Backend base URL used by the API client (`src/services/api-client.ts`). Point it at the deployed Render backend in production. |

## Deploy

- Vercel: set the Root Directory to `apps/web`, branch `master`.
  Add `NEXT_PUBLIC_API_URL` to the Vercel project Environment Variables —
  it is read at build time and inlined by Next.js.
- Docker: the image at the repo root via `docker compose`.
