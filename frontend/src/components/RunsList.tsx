import type { Run } from '../api'

interface Props {
  runs: Run[] | null
  error: string | null
  selectedRunId: string | null
  onSelect: (runId: string) => void
}

export default function RunsList({ runs, error, selectedRunId, onSelect }: Props) {
  if (error) return <div className="status status-error">{error}</div>
  if (runs === null) return <div className="status">Loading…</div>
  if (runs.length === 0) return <div className="status">No runs.</div>

  return (
    <ul className="runs-list">
      {runs.map((run) => (
        <li
          key={run.run_id}
          className={`runs-row${run.run_id === selectedRunId ? ' selected' : ''}`}
          onClick={() => onSelect(run.run_id)}
        >
          <span className="run-id" title={run.run_id}>{run.run_id}</span>
          <span className="run-label">{run.run_label ?? '—'}</span>
        </li>
      ))}
    </ul>
  )
}
