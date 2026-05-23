from fastapi import FastAPI
from pydantic import BaseModel

from .db import get_client

app = FastAPI(title="JupiterLI-browser")


class Run(BaseModel):
    run_id: str
    run_label: str | None


class Series(BaseModel):
    series_id: str
    key: str


@app.get("/api/health")
def health() -> dict:
    get_client().query("SELECT 1")
    return {"ok": True}


@app.get("/api/runs", response_model=list[Run])
def list_runs() -> list[Run]:
    result = get_client().query(
        "SELECT run_id, run_label FROM runs_dets ORDER BY created_ts DESC"
    )
    return [Run(run_id=row[0], run_label=row[1]) for row in result.result_rows]


@app.get("/api/runs/{run_id}/series", response_model=list[Series])
def list_series(run_id: str) -> list[Series]:
    result = get_client().query(
        "SELECT series_id, key FROM series_dets WHERE run_id = %(run_id)s ORDER BY key",
        parameters={"run_id": run_id},
    )
    return [Series(series_id=row[0], key=row[1]) for row in result.result_rows]
