'use client';
import { useMemo } from 'react';
import useSWR from 'swr';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

export interface MarinePolygonProps {
  MIMES_ID?: number | string;
  id?: number | string;
  ID?: number | string;
  GRID_ID?: string;
  Name?: string;
  NbS_Score?: number;
  Restoration_Potential?: number;
  Conservation_Value?: number;
  [k: string]: unknown;
}

const fetcher = async (url: string): Promise<FeatureCollection<Polygon | MultiPolygon, MarinePolygonProps>> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
};

// Bump CACHE_BUST whenever you need to force-invalidate the CDN cache for
// the polygon datasets — appending it as a query param makes the CDN treat
// each value as a new URL (different cache key). The route-handler change
// to `Cache-Control: max-age=300, must-revalidate` (2026-05-13) prevents
// this from being needed for FUTURE updates, but the prior `immutable`
// entries are still stuck in CDN and we need to bypass them once.
const CACHE_BUST = '2026-05-13-clade-numeric';

export function usePolygonGeoJson(datasetId: string | null) {
  const url = datasetId
    ? `/api/data/${encodeURIComponent(datasetId)}?cb=${CACHE_BUST}`
    : null;
  const { data, error, isLoading } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  // Memoize to keep the returned-object reference stable across renders —
  // consumers feed this into useMemo/useEffect dependencies.
  return useMemo(
    () => ({ data, error: error ?? null, isLoading }),
    [data, error, isLoading],
  );
}

export type MarinePolygonFeature = Feature<Polygon | MultiPolygon, MarinePolygonProps>;
