import type { Series } from '../api'
import SeriesPlot from './SeriesPlot'

interface Props {
  selectedRunId: string | null
  series: Series[] | null
  error: string | null
}

export default function SeriesPlots({ selectedRunId, series, error }: Props) {
  if (!selectedRunId) return <div className="status">Select a run to see its plots.</div>
  if (error) return <div className="status status-error">{error}</div>
  if (series === null) return <div className="status">Loading…</div>
  if (series.length === 0) return <div className="status">This run has no series.</div>

  return (
    <div className="plots-container">
      {series.map((s) => (
        <SeriesPlot key={s.series_id} series={s} />
      ))}
    </div>
  )
}
