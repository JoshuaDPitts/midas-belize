'use client'
import useSWR from 'swr'
import { dataFetcher, type FetcherResult } from '../cache/fetcher'

export interface UseLayerDataResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  version: string | null
  provenance: FetcherResult<T>['provenance']
}

export function useLayerData<T = unknown>(
  datasetId: string | null,
  opts: { version?: string } = {},
): UseLayerDataResult<T> {
  const url = datasetId
    ? `/api/data/${encodeURIComponent(datasetId)}${opts.version ? `?v=${encodeURIComponent(opts.version)}` : ''}`
    : null

  const { data, error, isLoading } = useSWR<FetcherResult<T>>(
    url,
    (u: string) => dataFetcher<T>(u),
    {
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  )

  return {
    data: data?.data ?? null,
    loading: isLoading,
    error: error ?? null,
    version: data?.version ?? null,
    provenance: data?.provenance ?? null,
  }
}
