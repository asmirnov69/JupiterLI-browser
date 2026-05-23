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

## Configuration

Copy `backend/.env.example` to `backend/.env` if ClickHouse is not on `localhost:8123` with the default user.
