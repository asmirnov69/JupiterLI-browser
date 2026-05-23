import type { Series } from '../api'

interface Props {
  selectedRunId: string | null
  series: Series[] | null
  error: string | null
}

export default function SeriesList({ selectedRunId, series, error }: Props) {
  if (!selectedRunId) return <div className="status">Select a run to see its series.</div>
  if (error) return <div className="status status-error">{error}</div>
  if (series === null) return <div className="status">Loading…</div>
  if (series.length === 0) return <div className="status">This run has no series.</div>

  return (
    <ul className="series-list">
      {series.map((s) => (
        <li key={s.series_id} className="series-row">
          <span className="series-key">{s.key}</span>
          <span className="series-id">{s.series_id}</span>
        </li>
      ))}
    </ul>
  )
}
