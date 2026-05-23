import type { Run, Series } from '../api'

interface Props {
  runs: Run[] | null
  error: string | null
  selectedRunId: string | null
  expanded: Set<string>
  seriesByRun: Record<string, Series[]>
  seriesErrorByRun: Record<string, string>
  loadingSeries: Set<string>
  onSelectRun: (runId: string) => void
  onToggleExpand: (runId: string) => void
}

export default function RunsTree({
  runs,
  error,
  selectedRunId,
  expanded,
  seriesByRun,
  seriesErrorByRun,
  loadingSeries,
  onSelectRun,
  onToggleExpand,
}: Props) {
  if (error) return <div className="status status-error">{error}</div>
  if (runs === null) return <div className="status">Loading…</div>
  if (runs.length === 0) return <div className="status">No runs.</div>

  return (
    <ul className="tree">
      {runs.map((run) => {
        const isExpanded = expanded.has(run.run_id)
        const isSelected = run.run_id === selectedRunId
        const series = seriesByRun[run.run_id]
        const seriesError = seriesErrorByRun[run.run_id]
        const isLoading = loadingSeries.has(run.run_id)
        return (
          <li key={run.run_id} className="tree-run">
            <div
              className={`tree-row tree-run-row${isSelected ? ' selected' : ''}`}
              onClick={() => onSelectRun(run.run_id)}
            >
              <button
                type="button"
                className="caret"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleExpand(run.run_id)
                }}
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? '▾' : '▸'}
              </button>
              <span className="run-id" title={run.run_id}>{run.run_id}</span>
              <span className="run-label">{run.run_label ?? '—'}</span>
            </div>
            {isExpanded && (
              <ul className="tree-children">
                {seriesError && (
                  <li className="tree-row tree-status status-error">{seriesError}</li>
                )}
                {!seriesError && isLoading && (
                  <li className="tree-row tree-status">Loading…</li>
                )}
                {!seriesError && !isLoading && series && series.length === 0 && (
                  <li className="tree-row tree-status">No series.</li>
                )}
                {!seriesError && series && series.map((s) => {
                  const tail = s.series_id.split('----').pop() ?? s.series_id
                  return (
                    <li key={s.series_id} className="tree-row tree-series-row">
                      <span className="series-id" title={s.series_id}>{tail.slice(0, 4)}</span>
                      <span className="series-key">{s.key}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}
