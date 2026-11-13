'use client';
import useSWR from 'swr';
import { dataFetcher, type FetcherResult } from '@/lib/data/cache/fetcher';
import type { SchemaDrift } from '@/lib/data/types';

export type DriftTicket = SchemaDrift & { id: string };

export interface UseDriftTicketResult {
  ticket: DriftTicket | null;
  loading: boolean;
  error: Error | null;
  mutate: () => Promise<unknown>;
}

export function useDriftTicket(driftId: string | null): UseDriftTicketResult {
  const url = driftId ? `/api/ops/drift/${encodeURIComponent(driftId)}` : null;
  const { data, error, isLoading, mutate } = useSWR<FetcherResult<{ drift: DriftTicket }>>(
    url,
    (u: string) => dataFetcher(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  return {
    ticket: data?.data?.drift ?? null,
    loading: driftId !== null && isLoading,
    error: error ?? null,
    mutate,
  };
}
