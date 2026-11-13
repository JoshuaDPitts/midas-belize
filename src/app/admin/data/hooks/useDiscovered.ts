'use client';
import useSWR from 'swr';
import { dataFetcher, type FetcherResult } from '@/lib/data/cache/fetcher';
import type { DiscoveredFile } from '@/lib/data/types';

export type DiscoveredEntry = DiscoveredFile & { id: string };

export interface UseDiscoveredResult {
  files: DiscoveredEntry[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<unknown>;
}

export function useDiscovered(opts: {
  status?: DiscoveredFile['status'];
  pollMs?: number;
} = {}): UseDiscoveredResult {
  const status = opts.status ?? 'unrecognized';
  const url = `/api/ops/discovered?status=${encodeURIComponent(status)}`;
  const { data, error, isLoading, mutate } = useSWR<
    FetcherResult<{ discovered: DiscoveredEntry[] }>
  >(url, (u: string) => dataFetcher(u), {
    refreshInterval: opts.pollMs ?? 60_000,
    revalidateOnFocus: false,
  });
  return {
    files: data?.data?.discovered ?? [],
    loading: isLoading,
    error: error ?? null,
    refresh: mutate,
  };
}
