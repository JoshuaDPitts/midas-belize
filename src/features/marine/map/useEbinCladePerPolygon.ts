'use client';
import { useMemo } from 'react';
import { usePolygonGeoJson } from './usePolygonGeoJson';
import type { MarineLayerConfigSpec } from './MarineMapLayers.types';

export type MarineSite = 'placencia' | 'caye-caulker';

const EBIN_DATASETS: Record<MarineSite, Record<MarineLayerConfigSpec['family'], string | null>> = {
  placencia: {
    'marine-polygons': 'placencia-marine-ebin-clade-detail',
    'coast-polygons': 'placencia-coast-ebin-clade-detail',
    'polygon-grid': 'placencia-30polygons-ebin-clade-detail',
  },
  'caye-caulker': {
    'marine-polygons': 'cayecaulker-marine-ebin-clade-detail',
    'coast-polygons': 'cayecaulker-coast-ebin-clade-detail',
    'polygon-grid': 'cayecaulker-mimes-ebin-clade-detail',
  },
};

export interface AggregatedCladeRow {
  /** Original polygon key value as it appears on the polygon shape (MIMES_ID etc.). */
  polygonKey: string | number;
  /** Polygon-level area-weighted Clade_N_pct, 0-indexed (clades[0] = Clade_1_pct). 25 entries. */
  clades: number[];
  /** 1-indexed clade with the highest area-weighted polygon share, or null if no data. */
  dominantClade: number | null;
}

export type CladeLookupByFamily = Record<MarineLayerConfigSpec['family'], Map<string, AggregatedCladeRow>>;

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

/**
 * Aggregates ebin-clade-detail rows (one feature per polygon × BIN_ID) into
 * per-polygon dominant clade. Polygon share of clade N is the area-weighted
 * sum across BIN_IDs of `Clade_N_pct * Area_Pct_of_Polygon / 100`.
 *
 * Tolerates string-typed numeric values because the live `-ebin-clade-detail`
 * datasets were published before the csv-polygon-join numeric-coercion fix
 * (commit 44f8b18) and still serve strings until the next rerun republishes.
 */
export function aggregateRows(features: FeatureLike[]): Map<string, AggregatedCladeRow> {
  const acc = new Map<string, { sums: number[]; rawKey: string | number }>();
  for (const f of features) {
    const props = f.properties ?? {};
    const rawKey =
      (props.MIMES_ID as string | number | undefined) ??
      (props.Polygon_ID as string | number | undefined) ??
      (props.id as string | number | undefined) ??
      (props.ID as string | number | undefined) ??
      null;
    if (rawKey === null || rawKey === undefined || rawKey === '') continue;
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

const EMPTY_MAP: Map<string, AggregatedCladeRow> = new Map();

/**
 * Fetches the 3 per-family ebin-clade-detail datasets for the active site
 * and returns per-family Map<polygonKey, AggregatedCladeRow> lookups.
 * Returns empty maps when site is null. Site=null short-circuits all fetches.
 */
export function useEbinCladePerPolygon(site: MarineSite | null): { byFamily: CladeLookupByFamily; loading: boolean } {
  const ids = site ? EBIN_DATASETS[site] : null;
  const marine = usePolygonGeoJson(ids?.['marine-polygons'] ?? null);
  const coast = usePolygonGeoJson(ids?.['coast-polygons'] ?? null);
  const grid = usePolygonGeoJson(ids?.['polygon-grid'] ?? null);

  return useMemo(() => {
    const buildMap = (data: { features?: FeatureLike[] } | undefined): Map<string, AggregatedCladeRow> => {
      if (!data || !Array.isArray(data.features) || data.features.length === 0) return EMPTY_MAP;
      return aggregateRows(data.features);
    };
    return {
      byFamily: {
        'marine-polygons': buildMap(marine.data),
        'coast-polygons': buildMap(coast.data),
        'polygon-grid': buildMap(grid.data),
      },
      loading: marine.isLoading || coast.isLoading || grid.isLoading,
    };
  }, [marine.data, coast.data, grid.data, marine.isLoading, coast.isLoading, grid.isLoading]);
}
