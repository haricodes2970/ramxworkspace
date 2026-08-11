# RamxWorkspace API

Minimal FastAPI backend foundation for RamxWorkspace.

Deployment target: Render or Railway. The service exposes a single
health endpoint and environment-based CORS configuration. No product
features yet — document APIs, storage and authentication arrive in
later phases.

## Run locally

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

## Environment

Copy the example file and adjust as needed:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed browser origin (CORS). Set to the Vercel production URL after the frontend is deployed. |
| `API_HOST` | `0.0.0.0` | Bind address (Render/Railway inject their own). |
| `API_PORT` | `8000` | Listen port. |

Never commit `.env` files. Only `.env.example` belongs in Git.

## Tests

```bash
pip install -r requirements.txt
pytest
```

## Structure

```txt
apps/api/
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
