# JupiterLI-browser

Webapp for browsing scientific time-series runs produced by the JupiterLI Python project.

## Run locally

Backend (FastAPI, port 8000):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend (Vite + React, port 5173):

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints. Vite proxies `/api/*` to FastAPI on `:8000`.

## Network access

`vite.config.ts` sets `server.host: true`, so the Vite dev server binds to `0.0.0.0` and can be reached from other machines on the same network at `http://<this-host-ip>:5173/`. The FastAPI backend stays on loopback — Vite proxies the API locally, so no need to expose the backend directly.

The Vite dev server is intended for development on a trusted network; do not expose it on the open internet.

## Configuration

Copy `backend/.env.example` to `backend/.env` if ClickHouse is not on `localhost:8123` with the default user.
