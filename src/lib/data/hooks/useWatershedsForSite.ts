'use client';
import useSWR from 'swr';
import type { SiteId } from '../types';
import { dataFetcher, type FetcherResult } from '../cache/fetcher';

export interface WatershedJoinedRow {
  Name?: string;
  WATERSHED?: string;
  MIMES_ID?: number | string;
  [key: string]: unknown;
}

export interface UseWatershedsForSiteResult {
  geometry: GeoJSON.FeatureCollection | null;
  joinedAttrs: {
    nbs: WatershedJoinedRow[];
    clade: WatershedJoinedRow[];
    rusle: WatershedJoinedRow[];
  } | null;
  loading: boolean;
  error: Error | null;
}

function geometryDatasetForSite(site: SiteId | null): string | null {
  if (site === 'placencia') return 'placencia-watershed-polygons';
  if (site === 'caye-caulker') return 'cayecaulker-watershed-polygons';
  if (site === 'laughing-bird') return null;
  return 'watersheds-utm-shape';
}

function joinedDatasetsForSite(
  site: SiteId | null,
): { nbs: string; clade: string; rusle: string } | null {
  if (site === 'placencia') {
    return {
      nbs: 'placencia-watersheds-nbs-scores',
      clade: 'placencia-watersheds-ebin-clade-detail',
      rusle: 'placencia-watersheds-rusle-factors',
    };
  }
  if (site === 'caye-caulker') {
    return {
      nbs: 'watersheds-all-nbs-scores',
      clade: 'watersheds-all-ebin-clade-detail',
      rusle: 'cayecaulker-watersheds-rusle-factors',
    };
  }
  if (site === null) {
    return {
      nbs: 'watersheds-all-nbs-scores',
      clade: 'watersheds-all-ebin-clade-detail',
      rusle: 'belize-watersheds-rusle-factors',
    };
  }
  return null;
}

type JoinedPayload =
  | { rows?: WatershedJoinedRow[] }
  | GeoJSON.FeatureCollection;

/** Joined-attrs datasets can publish either as a plain `{rows: [...]}`
 * payload or as a GeoJSON FeatureCollection where each feature's
 * `properties` object IS the row. Normalise to a row array. */
export function joinedPayloadToRows(payload: JoinedPayload | undefined | null): WatershedJoinedRow[] {
  if (!payload) return [];
  if (Array.isArray((payload as { rows?: unknown }).rows)) {
    return (payload as { rows: WatershedJoinedRow[] }).rows;
  }
  const fc = payload as GeoJSON.FeatureCollection;
  if (fc?.type === 'FeatureCollection' && Array.isArray(fc.features)) {
    return fc.features
      .map((f) => (f.properties ?? null) as WatershedJoinedRow | null)
      .filter((r): r is WatershedJoinedRow => r !== null);
  }
  return [];
}

export function useWatershedsForSite(site: SiteId | null): UseWatershedsForSiteResult {
  const geomDs = geometryDatasetForSite(site);
  const joined = joinedDatasetsForSite(site);

  const geom = useSWR<FetcherResult<GeoJSON.FeatureCollection>>(
    geomDs ? `/api/data/${geomDs}` : null,
    (u: string) => dataFetcher<GeoJSON.FeatureCollection>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const nbs = useSWR<FetcherResult<JoinedPayload>>(
    joined ? `/api/data/${joined.nbs}` : null,
    (u: string) => dataFetcher<JoinedPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const clade = useSWR<FetcherResult<JoinedPayload>>(
    joined ? `/api/data/${joined.clade}` : null,
    (u: string) => dataFetcher<JoinedPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const rusle = useSWR<FetcherResult<JoinedPayload>>(
    joined ? `/api/data/${joined.rusle}` : null,
    (u: string) => dataFetcher<JoinedPayload>(u),
    // RUSLE factor join is optional: the dataset may not be published yet
    // for a given site. Don't gate the hook's loading state on it; if the
    // fetch 404s, treat as empty rows.
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const loading =
    (!!geomDs && geom.isLoading) ||
    (!!joined && (nbs.isLoading || clade.isLoading));
  const error = (geom.error ?? nbs.error ?? clade.error ?? null) as Error | null;

  const joinedAttrs =
    joined && nbs.data && clade.data
      ? {
          nbs: joinedPayloadToRows(nbs.data.data),
          clade: joinedPayloadToRows(clade.data.data),
          rusle: rusle.data ? joinedPayloadToRows(rusle.data.data) : [],
        }
      : null;

  return {
    geometry: geom.data?.data ?? null,
    joinedAttrs,
    loading,
    error,
  };
}
