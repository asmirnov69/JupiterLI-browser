import { useEffect, useRef, useState } from 'react'
import Plot from 'react-plotly.js'
import {
  getSeriesHistory,
  getSeriesLive,
  getStreamLatestId,
  type Series,
  type SeriesHistory,
} from '../api'

interface Props {
  series: Series
}

const POLL_INTERVAL_MS = 2000
const INACTIVE_FALLBACK_MS = 3000

type XAxisKind = 'time' | 'serial'
type ViewMode = 'plot' | 'hist' | 'plot+hist'
const VIEW_MODES: ViewMode[] = ['plot', 'hist', 'plot+hist']

interface Buffer {
  xAxis: XAxisKind | null
  serials: number[]
  timestamps: number[]
  values: number[]
}

const emptyBuffer: Buffer = { xAxis: null, serials: [], timestamps: [], values: [] }

function inferXAxis(sampleTimestamp: number): XAxisKind {
  return sampleTimestamp === -1.0 ? 'serial' : 'time'
}

export default function SeriesPlot({ series }: Props) {
  const [buf, setBuf] = useState<Buffer>(emptyBuffer)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<ViewMode>('plot')

  const cursorRef = useRef<{
    lastStreamId: string | null
    historyLoaded: boolean
    historyInFlight: boolean
    maxKnownSerial: number | null
  }>({
    lastStreamId: null,
    historyLoaded: false,
    historyInFlight: false,
    maxKnownSerial: null,
  })

  useEffect(() => {
    let cancelled = false
    setBuf(emptyBuffer)
    setError(null)
    cursorRef.current = {
      lastStreamId: null,
      historyLoaded: false,
      historyInFlight: false,
      maxKnownSerial: null,
    }

    const applyHistory = (hist: SeriesHistory) => {
      const cur = cursorRef.current
      cur.historyLoaded = true
      cur.historyInFlight = false
      if (hist.serials.length === 0) return
      const histMax = hist.serials[hist.serials.length - 1]
      cur.maxKnownSerial = Math.max(cur.maxKnownSerial ?? -Infinity, histMax)
      setBuf((prev) => ({
        xAxis: prev.xAxis ?? inferXAxis(hist.timestamps[0]),
        serials: [...hist.serials, ...prev.serials],
        timestamps: [...hist.timestamps, ...prev.timestamps],
        values: [...hist.values, ...prev.values],
      }))
    }

    const loadHistory = (maxSerial: number | null) => {
      const cur = cursorRef.current
      if (cur.historyLoaded || cur.historyInFlight) return
      cur.historyInFlight = true
      getSeriesHistory(series.series_id, maxSerial)
        .then((hist) => {
          if (cancelled) return
          applyHistory(hist)
        })
        .catch((err: Error) => {
          if (!cancelled) {
            cur.historyInFlight = false
            setError(err.message)
          }
        })
    }

    // Bootstrap the Redis cursor at the current stream tail so we only see
    // entries that arrive from now on ("$" semantics).
    getStreamLatestId()
      .then((res) => {
        if (cancelled) return
        cursorRef.current.lastStreamId = res.latest_id
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    // If no live entries arrive within INACTIVE_FALLBACK_MS, assume the run is
    // no longer producing telemetry and load the full series from CH.
    const inactiveTimer = setTimeout(() => {
      if (cancelled) return
      if (!cursorRef.current.historyLoaded) loadHistory(null)
    }, INACTIVE_FALLBACK_MS)

    const tick = async () => {
      const cur = cursorRef.current
      if (cancelled || cur.lastStreamId == null) return
      try {
        const live = await getSeriesLive(series.series_id, cur.lastStreamId)
        if (cancelled) return
        cur.lastStreamId = live.next_after_id

        // Drop entries we already have via history (only matters in the
        // inactive-fallback path where history landed before this live entry).
        const fresh = live.entries.filter(
          (e) => cur.maxKnownSerial == null || e.run_serial_num > cur.maxKnownSerial,
        )
        if (fresh.length === 0) return

        // First live entry ever for this series → active path: load CH only
        // for rows strictly before this entry. (No-op if fallback already
        // fired history; loadHistory short-circuits on historyLoaded.)
        if (!cur.historyLoaded && !cur.historyInFlight) {
          clearTimeout(inactiveTimer)
          loadHistory(fresh[0].run_serial_num)
        }

        const lastSerial = fresh[fresh.length - 1].run_serial_num
        cur.maxKnownSerial = Math.max(cur.maxKnownSerial ?? -Infinity, lastSerial)

        setBuf((prev) => ({
          xAxis: prev.xAxis ?? inferXAxis(fresh[0].timestamp),
          serials: [...prev.serials, ...fresh.map((e) => e.run_serial_num)],
          timestamps: [...prev.timestamps, ...fresh.map((e) => e.timestamp)],
          values: [...prev.values, ...fresh.map((e) => e.value)],
        }))
      } catch (err) {
        if (!cancelled) setError((err as Error).message)
      }
    }

    const handle = setInterval(tick, POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(handle)
      clearTimeout(inactiveTimer)
    }
  }, [series.series_id])

  const ready = buf.xAxis !== null && buf.values.length > 0
  const showScatter = mode === 'plot' || mode === 'plot+hist'
  const showHist = mode === 'hist' || mode === 'plot+hist'

  const scatter = (
    <Plot
      data={[
        {
          type: 'scatter',
          mode: 'lines+markers',
          x:
            buf.xAxis === 'time'
              ? buf.timestamps.map((t) => new Date(t * 1000))
              : buf.serials,
          y: buf.values,
          marker: { size: 5 },
          name: series.key,
        },
      ]}
      layout={{
        autosize: true,
        uirevision: `${series.series_id}-plot`,
        margin: { l: 50, r: 20, t: 10, b: 40 },
        xaxis:
          buf.xAxis === 'time'
            ? { title: { text: 'timestamp' }, type: 'date' }
            : { title: { text: 'run_serial_num' }, type: 'linear' },
        yaxis: { title: { text: 'value' } },
      }}
      config={{ displaylogo: false, responsive: true }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler
    />
  )

  const histogram = (
    <Plot
      data={[
        {
          type: 'histogram',
          x: buf.values,
          name: series.key,
        },
      ]}
      layout={{
        autosize: true,
        uirevision: `${series.series_id}-hist`,
        margin: { l: 50, r: 20, t: 10, b: 40 },
        xaxis: { title: { text: 'value' } },
        yaxis: { title: { text: 'count' } },
        bargap: 0.05,
      }}
      config={{ displaylogo: false, responsive: true }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler
    />
  )

  return (
    <div className="plot-card">
      <div className="plot-header">
        <span className="series-key">{series.key}</span>
        <span className="series-id" title={series.series_id}>{series.series_id}</span>
        <select
          className="view-mode-select"
          value={mode}
          onChange={(e) => setMode(e.target.value as ViewMode)}
        >
          {VIEW_MODES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>
      {error && <div className="status status-error">{error}</div>}
      {!error && !ready && <div className="status">Loading…</div>}
      {!error && ready && (
        <div className="plot-content">
          {showScatter && <div className="plot-wrapper">{scatter}</div>}
          {showHist && <div className="plot-wrapper">{histogram}</div>}
        </div>
      )}
    </div>
  )
}
