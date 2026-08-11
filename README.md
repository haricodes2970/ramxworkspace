# RamxWorkspace

Privacy-first document workspace. The current MVP is a browser-based
PDF workspace: upload, view, search, annotate, edit pages, export and
download. Every document operation runs in the visitor's browser — no
backend, no third-party document services.

The repository is organized as two independently deployable
applications:

```txt
ramxworkspace/
├── apps/
│   ├── web/                     Next.js frontend (PDF MVP)
│   │   └── docs/PROJECT.md      Full project history and features
│   └── api/                     FastAPI backend foundation
├── docs/                        Repository-level documentation
├── docker-compose.yml           Frontend + backend containers (optional hosting)
└── README.md
```

## Quick start

### Frontend (Next.js)

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000

### Backend (FastAPI)

```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/health → `{"status": "ok"}`

## Repo layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Next.js 15 PDF workspace. Vercel Root Directory: `apps/web`. |
| `apps/api` | Minimal FastAPI service with `/health` and env-based CORS. Deployment target: Render or Railway. |
| `docker-compose.yml` | Optional self-hosting: frontend (context `./apps/web`) plus backend (context `./apps/api`). |

No shared code packages exist yet — the frontend and backend have no
runtime coupling. Shared contracts (API schemas, document types) will
be introduced only when a real need appears.

## Environment configuration

Each app keeps its own `.env.example`:

- `apps/web/.env.example` — frontend build-time values (`NEXT_PUBLIC_API_URL` points the API client at the backend: `http://localhost:8000` locally, the Render URL on Vercel)
- `apps/api/.env.example` — backend runtime values (`FRONTEND_URL` for CORS: `http://localhost:3000` locally, the Vercel origin on Render)

Never commit `.env` or `.env.local`. Only examples belong in Git.

The frontend API client (`apps/web/src/services/api-client.ts`) reads
`NEXT_PUBLIC_API_URL` and currently only calls `GET /health` — PDF files
are never sent to the backend; all document processing stays in the
browser.

## Deployment targets

- Frontend → Vercel (Root Directory: `apps/web`)
- Backend/API → Render or Railway (`apps/api`)
- Database/storage → Supabase (future, not yet integrated)
- Docker self-hosting → `docker compose up -d --build` (frontend + backend)

## Roadmap

MVP phases 1–8 are complete (see `apps/web/docs/PROJECT.md`).
Deployment restructuring (Phase 0) reorganizes the repository for
separate frontend/backend deployment. RamSpace 2.0 — authentication,
Supabase storage, folders, document expansion — has not started.

## Privacy

The MVP processes PDFs entirely in the browser. The container serves
the application only; document contents never leave the device.