import { useEffect, useState } from 'react'
import Plot from 'react-plotly.js'
import { getSeriesPoints, type Series, type SeriesPoints } from '../api'

interface Props {
  series: Series
}

export default function SeriesPlot({ series }: Props) {
  const [points, setPoints] = useState<SeriesPoints | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setPoints(null)
    setError(null)
    getSeriesPoints(series.series_id)
      .then((data) => {
        if (!cancelled) setPoints(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [series.series_id])

  return (
    <div className="plot-card">
      <div className="plot-header">
        <span className="series-key">{series.key}</span>
        <span className="series-id" title={series.series_id}>{series.series_id}</span>
      </div>
      {error && <div className="status status-error">{error}</div>}
      {!error && points === null && <div className="status">Loading…</div>}
      {!error && points && (
        <Plot
          data={[
            {
              type: 'scatter',
              mode: 'markers',
              x: points.ts.map((t) => new Date(t * 1000)),
              y: points.value,
              marker: { size: 5 },
              name: series.key,
            },
          ]}
          layout={{
            autosize: true,
            height: 280,
            margin: { l: 50, r: 20, t: 10, b: 40 },
            xaxis: { title: { text: 'timestamp' }, type: 'date' },
            yaxis: { title: { text: 'value' } },
          }}
          config={{ displaylogo: false, responsive: true }}
          style={{ width: '100%' }}
          useResizeHandler
        />
      )}
    </div>
  )
}
