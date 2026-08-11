# RamSpace Web

Next.js frontend of RamSpace — a privacy-first, client-side PDF
workspace (view, search, annotate, edit pages, export). All PDF
processing happens in the browser.

See [docs/PROJECT.md](docs/PROJECT.md) for the full project history,
feature details and architecture notes.

## Routes

| Route              | Purpose                                                                |
| ------------------ | ---------------------------------------------------------------------- |
| `/`                | Landing page (marketing, hero, features, privacy, document types, CTA) |
| `/workspace`       | Application shell — guest or authenticated, with the PDF workspace     |
| `/login`           | Email + password sign in                                               |
| `/signup`          | Email + password account creation                                      |
| `/forgot-password` | Password reset email request                                           |
| `/update-password` | New password entry (reached via the reset email link)                  |
| `/auth/confirm`    | Email confirmation info / error page                                   |
| `/auth/callback`   | Supabase confirmation & recovery redirect handler (code exchange)      |

## Authentication

Supabase Auth (email + password) with the SSR pattern: browser client
(`src/lib/supabase/client.ts`), server client (`src/lib/supabase/server.ts`)
and session refresh in `src/middleware.ts`. The workspace stays open to
guests; authentication only unlocks unlimited exports and replaces the
guest badge with an account menu.

## Guest mode

Visitors enter `/workspace` as guests — no login required. Guests get 3
free PDF exports, tracked locally in `localStorage` under
`ramspace-guest-export-count` (Zustand store:
`src/features/guest/guest-export-store.ts`). The count increments only
after a successful export; a fourth export attempt opens a conversion
dialog linking to `/signup` and `/login`. Authenticated users bypass the
limit entirely (`src/features/guest/use-export-permission.ts`). Clearing
browser data resets the counter; this is an intentional limitation, not
security enforcement.

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

| Variable                               | Default                 | Purpose                                                                                                                        |
| -------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_APP_NAME`                 | `RamSpace`              | Brand name shown in the UI.                                                                                                    |
| `NEXT_PUBLIC_APP_STAGE`                | `local`                 | Environment label.                                                                                                             |
| `NEXT_PUBLIC_API_URL`                  | `http://localhost:8000` | Backend base URL used by the API client (`src/services/api-client.ts`). Point it at the deployed Render backend in production. |
| `NEXT_PUBLIC_SUPABASE_URL`             | —                       | Supabase project URL. Required for all auth flows.                                                                             |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | —                       | Supabase publishable (anon) key. Client-safe; never use the service-role key here.                                             |
| `NEXT_PUBLIC_SITE_URL`                 | `http://localhost:3000` | Public site origin used to build auth redirect URLs (`/auth/callback`, `/update-password`).                                    |

## Supabase setup (one-time, dashboard)

1. Create a Supabase project.
2. Authentication → Sign In / Up → enable **Email** provider. Keep
   **Confirm email** enabled (the UI handles the confirmation state).
3. Authentication → URL Configuration:
   - Site URL: the Vercel production URL (e.g. `https://your-app.vercel.app`).
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`,
     `https://your-app.vercel.app/update-password`,
     `http://localhost:3000/auth/callback`,
     `http://localhost:3000/update-password`.
4. Copy project URL + publishable key into `.env.local` (never commit) and
   into the Vercel project env vars.
5. Note: Supabase's default email service is rate-limited (free tier). A
   custom SMTP provider can be configured later for production mail volume.

## Deploy

- Vercel: set the Root Directory to `apps/web`, branch `master`.
  Add `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL` to the
  Vercel project Environment Variables — they are read at build time and
  inlined by Next.js.
- Docker: the image at the repo root via `docker compose`.
