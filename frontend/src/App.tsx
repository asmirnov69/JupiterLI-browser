import { useEffect, useState } from 'react'
import { listRuns, listSeries, type Run, type Series } from './api'
import RunsList from './components/RunsList'
import SeriesList from './components/SeriesList'
import './App.css'

export default function App() {
  const [runs, setRuns] = useState<Run[] | null>(null)
  const [runsError, setRunsError] = useState<string | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [series, setSeries] = useState<Series[] | null>(null)
  const [seriesError, setSeriesError] = useState<string | null>(null)

  useEffect(() => {
    listRuns()
      .then(setRuns)
      .catch((err: Error) => setRunsError(err.message))
  }, [])

  useEffect(() => {
    if (!selectedRunId) {
      setSeries(null)
      setSeriesError(null)
      return
    }
    setSeries(null)
    setSeriesError(null)
    listSeries(selectedRunId)
      .then(setSeries)
      .catch((err: Error) => setSeriesError(err.message))
  }, [selectedRunId])

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="pane-header">Runs</header>
        <RunsList
          runs={runs}
          error={runsError}
          selectedRunId={selectedRunId}
          onSelect={setSelectedRunId}
        />
      </aside>
      <main className="main">
        <header className="pane-header">
          {selectedRunId ? `Series — ${selectedRunId}` : 'Series'}
        </header>
        <SeriesList
          selectedRunId={selectedRunId}
          series={series}
          error={seriesError}
        />
      </main>
    </div>
  )
}
