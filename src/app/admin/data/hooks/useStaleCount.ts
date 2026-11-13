'use client';
import { usePipelineStatus } from '@/lib/data';
import type { CatalogEntry } from '@/lib/data/types';

export interface StaleCountResult {
  stale: number;
  old: number;
  total: number;
  loading: boolean;
}

interface TimestampLike {
  _seconds: number;
}

function toMs(ts: unknown): number {
  if (ts == null) return 0;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && typeof (ts as TimestampLike)._seconds === 'number') {
    return (ts as TimestampLike)._seconds * 1000;
  }
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

export interface UseStaleCountOptions {
  staleHours?: number;
  oldDays?: number;
  now?: number;
}

export function useStaleCount(opts: UseStaleCountOptions = {}): StaleCountResult {
  const staleCutoff = (opts.staleHours ?? 24) * HOUR;
  const oldCutoff = (opts.oldDays ?? 7) * DAY;
  const now = opts.now ?? Date.now();
  const { datasets, loading } = usePipelineStatus();
  return tally(datasets, now, staleCutoff, oldCutoff, loading);
}

export function tally(
  datasets: CatalogEntry[],
  now: number,
  staleCutoff: number,
  oldCutoff: number,
  loading = false,
): StaleCountResult {
  let stale = 0;
  let old = 0;
  for (const d of datasets) {
    const ts = toMs(d.updated_at);
    if (ts === 0) continue;
    const age = now - ts;
    if (age > oldCutoff) {
      old += 1;
      stale += 1;
    } else if (age > staleCutoff) {
      stale += 1;
    }
  }
  return { stale, old, total: datasets.length, loading };
}
