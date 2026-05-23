import { useCallback, useEffect, useState } from 'react'
import { listRuns, listSeries, type Run, type Series } from './api'
import RunsTree from './components/RunsTree'
import SeriesPlots from './components/SeriesPlots'
import './App.css'

export default function App() {
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [seriesByRun, setSeriesByRun] = useState<Record<string, Series[]>>({})
  const [seriesErrorByRun, setSeriesErrorByRun] = useState<Record<string, string>>({})
  const [loadingSeries, setLoadingSeries] = useState<Set<string>>(new Set())

  useEffect(() => {
    listRuns()
      .then(setRuns)
      .catch((err: Error) => setRunsError(err.message))
  }, [])

  const ensureSeriesLoaded = useCallback(
    (runId: string) => {
      if (seriesByRun[runId] || loadingSeries.has(runId)) return
      setLoadingSeries((s) => new Set(s).add(runId))
      listSeries(runId)
        .then((data) => {
          setSeriesByRun((m) => ({ ...m, [runId]: data }))
        })
        .catch((err: Error) => {
          setSeriesErrorByRun((m) => ({ ...m, [runId]: err.message }))
        })
        .finally(() => {
          setLoadingSeries((s) => {
            const next = new Set(s)
            next.delete(runId)
            return next
          })
        })
    },
    [seriesByRun, loadingSeries],
  )

  const handleSelectRun = useCallback(
    (runId: string) => {
      setSelectedRunId(runId)
      setExpanded(new Set([runId]))
      ensureSeriesLoaded(runId)
    },
    [ensureSeriesLoaded],
  )

  const handleToggleExpand = useCallback(
    (runId: string) => {
      setExpanded((s) => {
        const next = new Set(s)
        if (next.has(runId)) {
          next.delete(runId)
        } else {
          next.add(runId)
          ensureSeriesLoaded(runId)
        }
        return next
      })
    },
    [ensureSeriesLoaded],
  )

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="pane-header">Runs</header>
        <RunsTree
          runs={runs}
          error={runsError}
          selectedRunId={selectedRunId}
          expanded={expanded}
          seriesByRun={seriesByRun}
          seriesErrorByRun={seriesErrorByRun}
          loadingSeries={loadingSeries}
          onSelectRun={handleSelectRun}
          onToggleExpand={handleToggleExpand}
        />
      </aside>
      <main className="main">
        <header className="pane-header">
          {(() => {
            if (!selectedRunId) return 'Plots'
            const run = runs?.find((r) => r.run_id === selectedRunId)
            const label = run?.run_label ?? selectedRunId
            return `Plots — ${label}`
          })()}
        </header>
        <SeriesPlots
          selectedRunId={selectedRunId}
          series={selectedRunId ? seriesByRun[selectedRunId] ?? null : null}
          error={selectedRunId ? seriesErrorByRun[selectedRunId] ?? null : null}
        />
      </main>
    </div>
  )
}
