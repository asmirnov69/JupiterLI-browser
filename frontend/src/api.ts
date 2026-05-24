export interface Run {
  run_id: string
  run_label: string | null
}

export interface Series {
  series_id: string
  key: string
}

export interface StreamLatestId {
  latest_id: string
}

export interface LivePoint {
  stream_id: string
  run_serial_num: number
  timestamp: number
  value: number
}

export interface SeriesLive {
  next_after_id: string
  entries: LivePoint[]
}

export interface SeriesHistory {
  timestamps: number[]
  values: number[]
  serials: number[]
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

export const getStreamLatestId = () => getJson<StreamLatestId>('/api/stream/latest_id')

export const getSeriesLive = (seriesId: string, afterId: string) =>
  getJson<SeriesLive>(
    `/api/series/${encodeURIComponent(seriesId)}/live?after_id=${encodeURIComponent(afterId)}`,
  )

export const getSeriesHistory = (seriesId: string, maxSerial: number | null) => {
  const url =
    maxSerial == null
      ? `/api/series/${encodeURIComponent(seriesId)}/history`
      : `/api/series/${encodeURIComponent(seriesId)}/history?max_serial=${maxSerial}`
  return getJson<SeriesHistory>(url)
}
