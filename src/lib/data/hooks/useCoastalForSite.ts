'use client';
import useSWR from 'swr';
import type { SiteId } from '../types';
import { dataFetcher, type FetcherResult } from '../cache/fetcher';

export type CoastalResolution = 'hires' | 'lores';

export interface CoastalRow {
  [key: string]: unknown;
}

export interface UseCoastalForSiteResult {
  geometry: GeoJSON.FeatureCollection | null;
  joinedAttrs: {
    nbs: CoastalRow[];
    clade: CoastalRow[];
    urbanRatio: CoastalRow[];
    landcover: CoastalRow[];
    fetch: CoastalRow[];
    erosion: CoastalRow[];
  } | null;
  loading: boolean;
  error: Error | null;
}

// Dataset ID resolution table (from CO-003 design spec)
//
// | Data        | Lo-res (Placencia)                              | Hi-res (Placencia)                             | Caye Caulker                        |
// |-------------|--------------------------------------------------|------------------------------------------------|-------------------------------------|
// | Geometry    | placencia-coast-polygons                         | placencia-30polygons-shape                     | cayecaulker-coast-polygons          |
// | NbS         | placencia-coast-nbs-scores                       | placencia-30polygons-nbs-scores                | cayecaulker-coast-nbs-scores        |
// | Clade       | placencia-coast-ebin-clade-detail                | placencia-30polygons-ebin-clade-detail         | cayecaulker-coast-ebin-clade-detail |
// | Urban ratio | coastal-placencia-lowres-poly-attributes         | coastal-placencia-hires-urban-ratio            | null                                |
// | Landcover   | output-coast-placencia-lores-landcover-basecase  | output-coast-placencia-hires-landcover-bc      | null                                |
// | Fetch       | coastal-placencia-lowres-fetch-by-wd             | coastal-placencia-hires-fetch30bywd8           | null                                |
// | Erosion     | null                                             | coastal-placencia-hires-pl-erosion             | null                                |

export function geometryDatasetForSite(
  site: SiteId | null,
  resolution: CoastalResolution,
): string | null {
  if (site === 'placencia') {
    return resolution === 'hires' ? 'placencia-30polygons-shape' : 'placencia-coast-polygons';
  }
  if (site === 'caye-caulker') {
    return 'cayecaulker-coast-polygons';
  }
  // laughing-bird and null
  return null;
}

export function joinedDatasetsForSite(
  site: SiteId | null,
  resolution: CoastalResolution,
): {
  nbs: string;
  clade: string;
  urbanRatio: string | null;
  landcover: string | null;
  fetch: string | null;
  erosion: string | null;
} | null {
  if (site === 'placencia') {
    const isHires = resolution === 'hires';
    return {
      nbs: isHires ? 'placencia-30polygons-nbs-scores' : 'placencia-coast-nbs-scores',
      clade: isHires
        ? 'placencia-30polygons-ebin-clade-detail'
        : 'placencia-coast-ebin-clade-detail',
      urbanRatio: isHires
        ? 'coastal-placencia-hires-urban-ratio'
        : 'coastal-placencia-lowres-poly-attributes',
      landcover: isHires
        ? 'output-coast-placencia-hires-landcover-bc'
        : 'output-coast-placencia-lores-landcover-basecase',
      fetch: isHires
        ? 'coastal-placencia-hires-fetch30bywd8'
        : 'coastal-placencia-lowres-fetch-by-wd',
      erosion: isHires ? 'coastal-placencia-hires-pl-erosion' : null,
    };
  }
  if (site === 'caye-caulker') {
    return {
      nbs: 'cayecaulker-coast-nbs-scores',
      clade: 'cayecaulker-coast-ebin-clade-detail',
      urbanRatio: null,
      landcover: null,
      fetch: null,
      erosion: null,
    };
  }
  // laughing-bird and null
  return null;
}

type JoinedPayload = { rows?: CoastalRow[] } | GeoJSON.FeatureCollection;

function joinedPayloadToRows(payload: JoinedPayload | undefined | null): CoastalRow[] {
  if (!payload) return [];
  if (Array.isArray((payload as { rows?: unknown }).rows)) {
    return (payload as { rows: CoastalRow[] }).rows;
  }
  const fc = payload as GeoJSON.FeatureCollection;
  if (fc?.type === 'FeatureCollection' && Array.isArray(fc.features)) {
    return fc.features
      .map((f) => (f.properties ?? null) as CoastalRow | null)
      .filter((r): r is CoastalRow => r !== null);
  }
  return [];
}

export function useCoastalForSite(
  site: SiteId | null,
  resolution: CoastalResolution,
): UseCoastalForSiteResult {
  const geomDs = geometryDatasetForSite(site, resolution);
  const joined = joinedDatasetsForSite(site, resolution);

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
  const urbanRatio = useSWR<FetcherResult<JoinedPayload>>(
    joined?.urbanRatio ? `/api/data/${joined.urbanRatio}` : null,
    (u: string) => dataFetcher<JoinedPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const landcover = useSWR<FetcherResult<JoinedPayload>>(
    joined?.landcover ? `/api/data/${joined.landcover}` : null,
    (u: string) => dataFetcher<JoinedPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const fetchDs = useSWR<FetcherResult<JoinedPayload>>(
    joined?.fetch ? `/api/data/${joined.fetch}` : null,
    (u: string) => dataFetcher<JoinedPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const erosion = useSWR<FetcherResult<JoinedPayload>>(
    joined?.erosion ? `/api/data/${joined.erosion}` : null,
    (u: string) => dataFetcher<JoinedPayload>(u),
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
          urbanRatio: urbanRatio.data ? joinedPayloadToRows(urbanRatio.data.data) : [],
          landcover: landcover.data ? joinedPayloadToRows(landcover.data.data) : [],
          fetch: fetchDs.data ? joinedPayloadToRows(fetchDs.data.data) : [],
          erosion: erosion.data ? joinedPayloadToRows(erosion.data.data) : [],
        }
      : null;

  return {
    geometry: geom.data?.data ?? null,
    joinedAttrs,
    loading,
    error,
  };
}
