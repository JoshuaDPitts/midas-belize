'use client';
import { useMemo } from 'react';
import useSWR from 'swr';
import type { SiteId } from '@/lib/data';

export interface AggregatedCladeRow {
  polygonKey: string | number;
  /** 25-entry array, 0-indexed: clades[0] = Clade_1_pct area-weighted sum. */
  clades: number[];
  /** 1-indexed dominant clade (1..25), or null when no Clade_N_pct present. */
  dominantClade: number | null;
}

interface FeatureLike {
  properties?: Record<string, unknown> | null;
}

function toNum(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function normaliseKey(k: string | number): string {
  return String(k).replace(/\.0+$/, '');
}

function watershedKey(props: Record<string, unknown>): string | number | null {
  const raw =
    (props.Name as string | number | undefined) ??
    (props.WATERSHED as string | number | undefined) ??
    (props.MIMES_ID as string | number | undefined) ??
    (props.Polygon_ID as string | number | undefined) ??
    null;
  if (raw === undefined || raw === null || raw === '') return null;
  return raw;
}

/**
 * Aggregates ebin-clade-detail rows for watersheds. Each input row is one
 * polygon × BIN_ID; the polygon-level share of clade N is the area-weighted
 * sum across BIN_IDs of `Clade_N_pct * Area_Pct_of_Polygon / 100`. Ties are
 * broken by lowest clade index. Tolerates string-typed numerics for legacy
 * datasets published before the csv-polygon-join numeric-coercion fix.
 */
export function aggregateRowsToCladeMap(
  features: FeatureLike[],
): Map<string, AggregatedCladeRow> {
  const acc = new Map<string, { sums: number[]; rawKey: string | number }>();
  for (const f of features) {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const rawKey = watershedKey(props);
    if (rawKey === null) continue;
    const polyKey = normaliseKey(rawKey);
    const areaWeight = (toNum(props.Area_Pct_of_Polygon) ?? 100) / 100;
    let entry = acc.get(polyKey);
    if (!entry) {
      entry = { sums: new Array(25).fill(0), rawKey };
      acc.set(polyKey, entry);
    }
    for (let i = 1; i <= 25; i++) {
      const v = toNum(props[`Clade_${i}_pct`]);
      if (v === null) continue;
      entry.sums[i - 1] += v * areaWeight;
    }
  }
  const out = new Map<string, AggregatedCladeRow>();
  for (const [polyKey, { sums, rawKey }] of acc) {
    let bestIdx = -1;
    let bestVal = 0;
    // Lowest clade index wins ties because the loop uses strict >.
    for (let i = 0; i < 25; i++) {
      if (sums[i] > bestVal) {
        bestVal = sums[i];
        bestIdx = i;
      }
    }
    out.set(polyKey, {
      polygonKey: rawKey,
      clades: sums,
      dominantClade: bestIdx >= 0 ? bestIdx + 1 : null,
    });
  }
  return out;
}

function ebinDatasetForSite(site: SiteId | null): string | null {
  if (site === 'placencia') return 'placencia-watersheds-ebin-clade-detail';
  if (site === 'laughing-bird') return null;
  // caye-caulker and national both fall back to the multi-site joined dataset
  return 'watersheds-all-ebin-clade-detail';
}

const EMPTY_LOOKUP: Map<string, AggregatedCladeRow> = new Map();

const fetcher = async (url: string): Promise<{ features?: FeatureLike[] } | null> => {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
};

export interface UseWatershedEbinCladeResult {
  lookup: Map<string, AggregatedCladeRow>;
  loading: boolean;
}

export function useWatershedEbinCladePerPolygon(site: SiteId | null): UseWatershedEbinCladeResult {
  const datasetId = ebinDatasetForSite(site);
  const url = datasetId ? `/api/data/${datasetId}` : null;
  const { data, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  return useMemo(() => {
    if (!data || !Array.isArray(data.features) || data.features.length === 0) {
      return { lookup: EMPTY_LOOKUP, loading: isLoading };
    }
    return { lookup: aggregateRowsToCladeMap(data.features), loading: isLoading };
  }, [data, isLoading]);
}
