'use client'
import useSWR from 'swr'
import { dataFetcher, type FetcherResult } from '../cache/fetcher'
import type { SiteId } from '../types'

export interface ScenarioSummary {
  id: string
  site: SiteId
  name: string
  description: string
  parameters: Record<string, unknown>
  time_range: { start: string; end: string }
}

export interface UseScenariosResult {
  scenarios: ScenarioSummary[]
  loading: boolean
  error: Error | null
}

export function useScenarios(site: SiteId | null): UseScenariosResult {
  const url = site ? `/api/scenarios/${encodeURIComponent(site)}` : null
  const { data, error, isLoading } = useSWR<
    FetcherResult<{ site: SiteId; scenarios: ScenarioSummary[] }>
  >(url, (u: string) => dataFetcher(u), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  return {
    scenarios: data?.data?.scenarios ?? [],
    loading: site !== null && isLoading,
    error: error ?? null,
  }
}
