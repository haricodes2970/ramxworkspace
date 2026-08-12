# RamSpace Web

Next.js frontend of RamSpace — a privacy-first, client-side PDF
workspace (view, search, annotate, edit pages, export). All PDF
processing happens in the browser.

See [docs/PROJECT.md](docs/PROJECT.md) for the full project history,
feature details and architecture notes.

## Routes

| Route                     | Purpose                                                                |
| ------------------------- | ---------------------------------------------------------------------- |
| `/`                       | Landing page (marketing, hero, features, privacy, document types, CTA) |
| `/workspace`              | Application shell — guest or authenticated, with the PDF workspace     |
| `/login`                  | Email + password sign in                                               |
| `/signup`                 | Email + password account creation                                      |
| `/forgot-password`        | Password reset email request                                           |
| `/update-password`        | New password entry (reached via the reset email link)                  |
| `/auth/confirm`           | Email confirmation info / error page                                   |
| `/auth/callback`          | Supabase confirmation & recovery redirect handler (code exchange)      |
| `/dashboard`              | Authenticated dashboard: greeting, recent documents, folder grid       |
| `/dashboard/documents`    | Document library (metadata list, cloud upload coming next)             |
| `/dashboard/folders/[id]` | Folder detail with documents, rename and delete actions                |

After sign-in/sign-up the app lands on `/dashboard`. Guests and signed-out
visitors are redirected to `/login` from dashboard routes.

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
| `NEXT_PUBLIC_MAX_UPLOAD_MB`            | `25`                    | Maximum cloud upload size in MB. Must stay under the bucket's `file_size_limit`.                                               |

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
5. Storage: run `supabase/migrations/0003_private_storage.sql` in the SQL
   Editor. It creates the private `documents` bucket (idempotent — no
   duplicate if re-run) and the storage RLS policies. Verify in the
   dashboard: Storage → Buckets → `documents` shows **Private**.
6. Cloud save: run `supabase/migrations/0004_storage_update_policy.sql`
   (the UPDATE policy required by upsert replacement).
7. Note: Supabase's default email service is rate-limited (free tier). A
   custom SMTP provider can be configured later for production mail volume.

## Database (Supabase Postgres)

Workspace data lives in two user-owned tables with full Row Level
Security — every policy scopes to `auth.uid() = user_id`, so users can
only see and modify their own rows:

- `folders` — one-level, user-owned folder tree (`name`, timestamps).
- `documents` — document metadata (`name`, `file_type`, `mime_type`,
  `size_bytes`, `storage_path`, `last_opened_at`). `folder_id` is
  `ON DELETE RESTRICT`: a folder containing documents cannot be deleted,
  which prevents orphaned metadata.

Migrations live in `supabase/migrations/` at the repository root and are
applied manually via the Supabase SQL Editor (order matters):
`0001_workspace_schema.sql` (tables, indexes, `set_updated_at()` trigger),
then `0002_workspace_rls.sql` (policies), then
`0003_private_storage.sql` (bucket + storage policies). Server-side data
access goes through `src/lib/dashboard-data.ts`; the client performs
row-scoped inserts/updates/deletes (folders) through the folder dialogs
in `src/features/folders/`. The server never trusts a client-supplied
`user_id` — RLS supplies ownership.

## Cloud document storage (Supabase Storage)

The PDF binary lives in a **private** bucket named `documents`
(`0003_private_storage.sql` creates it idempotently). Objects are stored
at `{user_id}/{document_id}/{filename}`, and storage RLS policies on
`storage.objects` verify that the first path segment equals `auth.uid()`,
so users can only reach their own objects. There is no public access, no
signed URL generation and no UPDATE policy — files are never modified in
place.

Bucket settings enforced by Supabase: `public = false`,
`file_size_limit = 26214400` (25 MB) and
`allowed_mime_types = ['application/pdf']`.

Client responsibilities:

- Uploads go directly from the browser to Supabase Storage (XHR with the
  session token and a real progress bar) — never through FastAPI.
- After the object uploads, a `documents` metadata row is inserted with
  the same UUID used in the storage path. If the metadata insert fails,
  the freshly uploaded object is deleted immediately (no orphans).
- Opening a cloud document fetches the metadata row and the private
  object through the authenticated session, loads the bytes into the
  existing PDF.js viewer at `/workspace?document=<id>`, and records
  `last_opened_at`. Export always downloads locally — it never
  overwrites the cloud original.
- Deleting a document removes the storage object first, then the
  metadata row, reporting any inconsistency instead of silently
  succeeding.
- Moving a document only updates `documents.folder_id`; the storage
  path is intentionally stable (`user_id`/`document_id` don't change).

The upload limit defaults to 25 MB and is configurable via
`NEXT_PUBLIC_MAX_UPLOAD_MB` (MB).

## Cloud save (Phase 5)

Cloud documents are editable: the edited PDF is generated locally with
the exact same engine used for export (`buildExportedPdf` +
`validateExportedPdf`), then **upserted onto the same storage path**
(`{user_id}/{document_id}/{filename}` — the document ID and folder never
change), and the metadata row's `size_bytes` is updated (`updated_at`
comes from the existing trigger). This upsert requires the UPDATE policy
added by `0004_storage_update_policy.sql` — Supabase executes upserts as
`INSERT ... ON CONFLICT DO UPDATE`, so both policies are evaluated; the
UPDATE policy carries the same `auth.uid()` ownership guard as the
others.

Save behavior:

- The Save button appears only for cloud documents; local PDFs keep
  their open → edit → download flow and are never auto-uploaded.
- A session-only dirty flag (baseline snapshot of annotations + page
  operations) drives a "Saved" / "Unsaved changes" status.
- Unsaved changes are protected: browser `beforeunload`, in-app link
  clicks and Close PDF all confirm first (Save / Discard / Cancel).
- Save is a single-user replace: no version history, no conflict
  resolution. If `updated_at` changed since the document was opened, the
  user is asked to confirm overwrite.
- The existing object is never deleted before the replacement uploads,
  so a failed save preserves the current cloud document. If the upload
  succeeds but the metadata update fails, the app reports the
  inconsistency and offers retry.
- Download export remains independent and never writes to the cloud.
  Cloud saves do not count against the guest export limit (guests have
  no Save button).

## Deploy

- Vercel: set the Root Directory to `apps/web`, branch `master`.
  Add `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `NEXT_PUBLIC_SITE_URL` to the
  Vercel project Environment Variables — they are read at build time and
  inlined by Next.js.
- Docker: the image at the repo root via `docker compose`.
