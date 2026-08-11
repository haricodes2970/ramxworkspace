# RamxWorkspace API

Minimal FastAPI backend foundation for RamxWorkspace.

Deployment target: Render or Railway as a Docker Web Service. The service
exposes a single health endpoint and environment-based CORS configuration.
No product features yet — document APIs, storage and authentication arrive
in later phases.

## Local Python development

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/health

Expected response:

```json
{"status": "ok"}
```

## Local Docker development

```bash
docker build -t ramxworkspace-api .
docker run -p 8000:8000 -e PORT=8000 ramxworkspace-api
```

## Docker build

```bash
cd apps/api
docker build -t ramxworkspace-api .
```

The image is built from `python:3.13-slim`. Dependencies are installed
from `requirements.txt`, the application runs as the non-root `api` user
(uid 1001), and no `.env` files or secrets are copied in.

## Docker run

```bash
docker run -p 8000:8000 -e PORT=8000 ramxworkspace-api
```

The container binds to `0.0.0.0` and listens on the `PORT` environment
variable, defaulting to `8000`. A Docker `HEALTHCHECK` polls
`/health` using Python's built-in `urllib` — no curl/wget added to the
image.

## /health

```bash
curl http://127.0.0.1:8000/health
# {"status": "ok"}
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed browser origin (CORS). Set to the Vercel production URL after the frontend is deployed. |
| `PORT` | `8000` | HTTP listen port. Render and Railway inject this automatically. |

`API_HOST` / `API_PORT` are honored by `app/core/config.py` for local use;
the Docker image binds `0.0.0.0:${PORT}` directly.

Never commit `.env` files. Only `.env.example` belongs in Git.

## Render deployment

| Setting | Value |
| --- | --- |
| Service type | Web Service |
| Runtime | Docker |
| Branch | `master` |
| Root Directory | `apps/api` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| Port | `8000` (Render overrides with `PORT`) |

No secrets or Env Vars are required to start the service. Set
`FRONTEND_URL` to the deployed frontend origin once it exists.

Railway uses the same Dockerfile with the same defaults.

## Structure

```txt
apps/api/
├── Dockerfile
├── .dockerignore
├── app/
│   ├── main.py        FastAPI entry point
│   ├── core/
│   │   └── config.py  Environment settings
│   └── api/
│       └── routes/
│           └── health.py
├── tests/
├── requirements.txt
└── README.md
```