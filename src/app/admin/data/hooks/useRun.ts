'use client';
import useSWR from 'swr';
import { dataFetcher, type FetcherResult } from '@/lib/data/cache/fetcher';
import type { PipelineRun } from '@/lib/data/types';

export interface UseRunResult {
  run: (PipelineRun & { id: string }) | null;
  loading: boolean;
  error: Error | null;
}

export function useRun(runId: string | null, opts: { pollMs?: number } = {}): UseRunResult {
  const url = runId ? `/api/ops/runs/${encodeURIComponent(runId)}` : null;
  const { data, error, isLoading } = useSWR<
    FetcherResult<{ run: PipelineRun & { id: string } }>
  >(url, (u: string) => dataFetcher(u), {
    refreshInterval: opts.pollMs,
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  return {
    run: data?.data?.run ?? null,
    loading: runId !== null && isLoading,
    error: error ?? null,
  };
}
