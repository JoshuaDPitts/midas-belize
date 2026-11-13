'use client';
import useSWR from 'swr';

/** 1-indexed month → catalog dataset id mapping. The data layer publishes
 * each month as a separate GeoTIFF under `rfactor-{jan..dec}`. */
const MONTH_DATASET_IDS = [
  'rfactor-jan',
  'rfactor-feb',
  'rfactor-mar',
  'rfactor-apr',
  'rfactor-may',
  'rfactor-jun',
  'rfactor-jul',
  'rfactor-aug',
  'rfactor-sep',
  'rfactor-oct',
  'rfactor-nov',
  'rfactor-dec',
] as const;

export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export function rfactorDatasetIdForMonth(month: Month): string {
  return MONTH_DATASET_IDS[month - 1];
}

/** Belize national bounding box. The catalog entries for rfactor-* don't
 * carry a per-dataset bbox today (`current_version.bbox = [0,0,0,0]`),
 * so we hardcode the country-wide envelope — accurate enough for an
 * overlay that's intended to cover Belize regardless. */
export const BELIZE_BOUNDS: [number, number, number, number] = [
  -89.25, 15.85, -87.5, 18.5,
];

export interface UseRFactorForMonthResult {
  /** Raw GCS-backed bytes URL for the COG. NOT directly renderable as a
   * Deck.gl BitmapLayer image — the underlying object is a Cloud-Optimised
   * GeoTIFF. Consumers must use a COG-aware loader (loaders.gl
   * GeoTIFFLoader, deck.gl-tile-server-style endpoint, etc.) or fall back
   * to the degraded "month atom drives UI but overlay stays hidden" path.
   * Null when month is null. */
  rasterUrl: string | null;
  /** Belize bbox. Hardcoded since the catalog doesn't store per-dataset
   * bbox for rasters today. */
  bounds: [number, number, number, number] | null;
  /** Catalog version id, useful as a cache-bust key for downstream loaders. */
  version: string | null;
  loading: boolean;
  error: Error | null;
}

interface CatalogEntryResponse {
  dataset: {
    current_version?: {
      version: string;
      content_type: string;
      size_bytes: number;
      gcs_path: string;
    };
    status: string;
  };
}

async function fetchCatalogEntry(url: string): Promise<CatalogEntryResponse> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`fetchCatalogEntry ${url}: HTTP ${res.status}`);
  }
  return (await res.json()) as CatalogEntryResponse;
}

/** Returns the raw-bytes URL + bbox + version for the R-factor raster of
 * the given month, or all-nulls when month is null. The /api/data/{id}
 * endpoint streams the COG bytes directly; deck.gl can consume it via a
 * COG-aware loader, or the UI can use the metadata to drive month-pick
 * affordances even without rendering the raster. */
export function useRFactorForMonth(month: Month | null): UseRFactorForMonthResult {
  const datasetId = month === null ? null : rfactorDatasetIdForMonth(month);
  const url = datasetId ? `/api/ops/datasets/${datasetId}` : null;
  const { data, error, isLoading } = useSWR<CatalogEntryResponse>(
    url,
    fetchCatalogEntry,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const cv = data?.dataset?.current_version;
  return {
    rasterUrl: datasetId && cv ? `/api/data/${datasetId}` : null,
    bounds: datasetId ? BELIZE_BOUNDS : null,
    version: cv?.version ?? null,
    loading: isLoading,
    error: (error ?? null) as Error | null,
  };
}
