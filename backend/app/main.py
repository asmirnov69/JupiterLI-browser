import json
import logging

from fastapi import FastAPI
from pydantic import BaseModel

from .config import settings
from .db import get_client, get_redis

logger = logging.getLogger(__name__)

app = FastAPI(title="JupiterLI-browser")


class Run(BaseModel):
    run_id: str
    run_label: str | None


class Series(BaseModel):
    series_id: str
    key: str


class StreamLatestId(BaseModel):
    latest_id: str


class LivePoint(BaseModel):
    stream_id: str
    run_serial_num: int
    timestamp: float
    value: float


class SeriesLive(BaseModel):
    next_after_id: str
    entries: list[LivePoint]


class SeriesHistory(BaseModel):
    timestamps: list[float]
    values: list[float]
    serials: list[int]


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


@app.get("/api/stream/latest_id", response_model=StreamLatestId)
def stream_latest_id() -> StreamLatestId:
    """Current tail of the telemetry stream — what `$` resolves to right now.
    Clients use this as their initial cursor to start listening from "the
    latest available message" onward."""
    try:
        info = get_redis().xinfo_stream(settings.redis_telemetry_key)
        latest = info.get("last-generated-id") or "0-0"
    except Exception:
        logger.exception("redis xinfo_stream failed")
        latest = "0-0"
    return StreamLatestId(latest_id=str(latest))


@app.get("/api/series/{series_id}/live", response_model=SeriesLive)
def series_live(series_id: str, after_id: str) -> SeriesLive:
    """Return new stream entries for `series_id` arriving after `after_id`
    (exclusive). The cursor (`next_after_id`) advances to the last stream id
    actually read, even if no entries matched this series — that's what keeps
    every subsequent poll a bounded delta read."""
    try:
        # Redis < 6.2 doesn't support exclusive "(<id>" — do an inclusive read
        # and drop the cursor entry on the server side.
        entries = get_redis().xrange(
            settings.redis_telemetry_key, min=after_id, max="+"
        )
    except Exception:
        logger.exception("redis xrange failed")
        return SeriesLive(next_after_id=after_id, entries=[])

    next_after = after_id
    matched: list[LivePoint] = []
    for stream_id, fields in entries:
        if stream_id == after_id:
            continue  # this is the cursor itself; already consumed last time
        next_after = stream_id
        raw = fields.get("data")
        if not raw:
            continue
        try:
            obj = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if obj.get("series_id") != series_id:
            continue
        try:
            matched.append(LivePoint(
                stream_id=stream_id,
                run_serial_num=int(obj["run_serial_num"]),
                timestamp=float(obj["timestamp"]),
                value=float(obj["value"]),
            ))
        except (KeyError, TypeError, ValueError):
            continue
    return SeriesLive(next_after_id=next_after, entries=matched)


@app.get("/api/series/{series_id}/history", response_model=SeriesHistory)
def series_history(series_id: str, max_serial: int | None = None) -> SeriesHistory:
    """One-shot ClickHouse backfill. With max_serial set, returns rows with
    run_serial_num < max_serial (the active-run path: everything older than
    the first live Redis observation). Without it, returns the full series —
    used as a fallback for runs that no longer produce live data."""
    if max_serial is None:
        result = get_client().query(
            """SELECT timestamp, value, run_serial_num
               FROM series
               WHERE series_id = %(series_id)s
               ORDER BY run_serial_num""",
            parameters={"series_id": series_id},
        )
    else:
        result = get_client().query(
            """SELECT timestamp, value, run_serial_num
               FROM series
               WHERE series_id = %(series_id)s AND run_serial_num < %(max_serial)s
               ORDER BY run_serial_num""",
            parameters={"series_id": series_id, "max_serial": max_serial},
        )
    return SeriesHistory(
        timestamps=[float(r[0]) for r in result.result_rows],
        values=[float(r[1]) for r in result.result_rows],
        serials=[int(r[2]) for r in result.result_rows],
    )
