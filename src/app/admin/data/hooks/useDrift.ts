'use client';
import useSWR from 'swr';
import { dataFetcher, type FetcherResult } from '@/lib/data/cache/fetcher';
import type { SchemaDrift } from '@/lib/data/types';

export type DriftTicket = SchemaDrift & { id: string };

export interface UseDriftResult {
  tickets: DriftTicket[];
  loading: boolean;
  error: Error | null;
}

export function useDrift(opts: {
  status?: SchemaDrift['status'];
  pollMs?: number;
} = {}): UseDriftResult {
  const status = opts.status ?? 'open';
  const url = `/api/ops/drift?status=${encodeURIComponent(status)}`;
  const { data, error, isLoading } = useSWR<FetcherResult<{ drift: DriftTicket[] }>>(
    url,
    (u: string) => dataFetcher(u),
    {
      refreshInterval: opts.pollMs ?? 30_000,
      revalidateOnFocus: false,
    },
  );
  return {
    tickets: data?.data?.drift ?? [],
    loading: isLoading,
    error: error ?? null,
  };
}
