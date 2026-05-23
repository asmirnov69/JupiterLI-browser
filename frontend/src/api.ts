export interface Run {
  run_id: string
  run_label: string | null
}

export interface Series {
  series_id: string
  key: string
}

export interface SeriesPoints {
  series_id: string
  ts: number[]
  value: number[]
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`)
  }
  return res.json() as Promise<T>
}

export const listRuns = () => getJson<Run[]>('/api/runs')

export const listSeries = (runId: string) =>
  getJson<Series[]>(`/api/runs/${encodeURIComponent(runId)}/series`)

export const getSeriesPoints = (seriesId: string) =>
  getJson<SeriesPoints>(`/api/series/${encodeURIComponent(seriesId)}/points`)
