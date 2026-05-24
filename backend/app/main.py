from typing import Literal

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


class SeriesPoints(BaseModel):
    series_id: str
    x_axis: Literal["time", "serial"]
    x: list[float]
    y: list[float]


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


@app.get("/api/series/{series_id}/points", response_model=SeriesPoints)
def series_points(series_id: str) -> SeriesPoints:
    result = get_client().query(
        "SELECT timestamp, value, run_serial_num FROM series WHERE series_id = %(series_id)s",
        parameters={"series_id": series_id},
    )
    rows = result.result_rows
    has_real_ts = any(row[0] != -1.0 for row in rows)
    if has_real_ts:
        rows = sorted(rows, key=lambda r: r[0])
        x = [float(r[0]) for r in rows]
        x_axis: Literal["time", "serial"] = "time"
    else:
        rows = sorted(rows, key=lambda r: r[2])
        x = [float(r[2]) for r in rows]
        x_axis = "serial"
    y = [float(r[1]) for r in rows]
    return SeriesPoints(series_id=series_id, x_axis=x_axis, x=x, y=y)
