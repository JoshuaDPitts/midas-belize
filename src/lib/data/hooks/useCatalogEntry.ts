'use client'
import useSWR from 'swr'
import { dataFetcher, type FetcherResult } from '../cache/fetcher'
import type { CatalogEntry, DatasetVersion } from '../types'

export interface UseCatalogEntryResult {
  entry: CatalogEntry | null
  versions: DatasetVersion[]
  loading: boolean
  error: Error | null
}

export function useCatalogEntry(datasetId: string | null): UseCatalogEntryResult {
  const url = datasetId ? `/api/ops/datasets/${encodeURIComponent(datasetId)}` : null
  const { data, error, isLoading } = useSWR<
    FetcherResult<{ dataset: CatalogEntry; versions: DatasetVersion[] }>
  >(url, (u: string) => dataFetcher(u), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  return {
    entry: data?.data?.dataset ?? null,
    versions: data?.data?.versions ?? [],
    loading: datasetId !== null && isLoading,
    error: error ?? null,
  }
}
