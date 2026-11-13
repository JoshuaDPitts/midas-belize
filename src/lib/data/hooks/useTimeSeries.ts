'use client'
import useSWR from 'swr'
import { dataFetcher, type FetcherResult } from '../cache/fetcher'

export interface TimeSeriesPayload {
  dataset_id: string
  scenario: string
  metric: string
  time_axis: string[]
  polygons: Array<{ polygon_id: number | string; values: (number | null)[] }>
  provenance: {
    source: string
    source_url: string | null
    license: string
    citation: string
    upstream_paths: string[]
  }
}

export interface UseTimeSeriesResult {
  data: TimeSeriesPayload | null
  loading: boolean
  error: Error | null
}

export function useTimeSeries(
  datasetId: string | null,
  opts: { scenario: string; metric: string },
): UseTimeSeriesResult {
  const url =
    datasetId && opts.scenario && opts.metric
      ? `/api/timeseries/${encodeURIComponent(datasetId)}?scenario=${encodeURIComponent(
          opts.scenario,
        )}&metric=${encodeURIComponent(opts.metric)}`
      : null

  const { data, error, isLoading } = useSWR<FetcherResult<TimeSeriesPayload>>(
    url,
    (u: string) => dataFetcher(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )

  return {
    data: data?.data ?? null,
    loading: url !== null && isLoading,
    error: error ?? null,
  }
}
