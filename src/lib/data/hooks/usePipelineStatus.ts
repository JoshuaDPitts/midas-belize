'use client'
import useSWR from 'swr'
import { dataFetcher, type FetcherResult } from '../cache/fetcher'
import type { CatalogEntry, PipelineRun } from '../types'

export interface UsePipelineStatusResult {
  datasets: CatalogEntry[]
  runs: PipelineRun[]
  loading: boolean
  error: Error | null
}

export function usePipelineStatus(
  opts: { limit?: number; pollMs?: number } = {},
): UsePipelineStatusResult {
  const { limit = 50, pollMs } = opts
  const runsRes = useSWR<FetcherResult<{ runs: PipelineRun[] }>>(
    `/api/ops/runs?limit=${limit}`,
    (u: string) => dataFetcher(u),
    { refreshInterval: pollMs, revalidateOnFocus: false },
  )
  const datasetsRes = useSWR<FetcherResult<{ datasets: CatalogEntry[] }>>(
    '/api/ops/datasets',
    (u: string) => dataFetcher(u),
    { refreshInterval: pollMs, revalidateOnFocus: false },
  )
  return {
    datasets: datasetsRes.data?.data?.datasets ?? [],
    runs: runsRes.data?.data?.runs ?? [],
    loading: runsRes.isLoading || datasetsRes.isLoading,
    error: runsRes.error ?? datasetsRes.error ?? null,
  }
}
