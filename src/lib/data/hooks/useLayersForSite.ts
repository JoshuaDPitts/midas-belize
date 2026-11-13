'use client'
import useSWR from 'swr'
import { dataFetcher, type FetcherResult } from '../cache/fetcher'
import type { SiteId } from '../types'

export interface LayerSummary {
  id: string
  layer: string
  title: string
  description: string
  family: string
  scope: 'site' | 'multi-site' | 'national'
  tags: string[]
  bbox: [number, number, number, number] | null
  temporal_extent: { start: string; end: string } | null
  data_url: string
  current_version: string | null
  provenance: {
    source: string
    source_url: string | null
    license: string
    citation: string
    upstream_paths: string[]
  }
}

export interface UseLayersForSiteResult {
  layers: LayerSummary[]
  loading: boolean
  error: Error | null
}

export function useLayersForSite(
  site: SiteId | null,
  opts: { domain?: string } = {},
): UseLayersForSiteResult {
  const url = site
    ? `/api/layers/${encodeURIComponent(site)}${
        opts.domain ? `?domain=${encodeURIComponent(opts.domain)}` : ''
      }`
    : null

  const { data, error, isLoading } = useSWR<
    FetcherResult<{ site: SiteId; layers: LayerSummary[] }>
  >(url, (u: string) => dataFetcher(u), {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  return {
    layers: data?.data?.layers ?? [],
    loading: site !== null && isLoading,
    error: error ?? null,
  }
}
