'use client';
import useSWR from 'swr';
import type { SiteId } from '../types';
import { dataFetcher, type FetcherResult } from '../cache/fetcher';
import type { CoastalResolution } from './useCoastalForSite';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CoastalScenarioRow {
  Polygon_ID?: string | number;
  value?: number;
  [key: string]: unknown;
}

export interface UseCoastalScenarioImpactResult {
  waveDeltas: Map<string, number>;
  erosionDeltas: Map<string, number>;
  servicesDeltas: Map<string, number>;
  loading: boolean;
}

type RowPayload = { rows?: CoastalScenarioRow[] } | GeoJSON.FeatureCollection;

// ---------------------------------------------------------------------------
// Dataset ID helpers
// ---------------------------------------------------------------------------

function waveDatasetId(
  site: SiteId | null,
  resolution: CoastalResolution,
  scenarioId: string,
): string | null {
  if (site !== 'placencia') return null;
  return `output-coast-placencia-${resolution}-wave-${scenarioId}`;
}

function erosionDatasetId(
  site: SiteId | null,
  resolution: CoastalResolution,
  scenarioId: string,
): string | null {
  if (site !== 'placencia') return null;
  return `output-coast-placencia-${resolution}-erosion-${scenarioId}`;
}

function servicesDatasetId(
  site: SiteId | null,
  resolution: CoastalResolution,
  scenarioId: string,
): string | null {
  if (site !== 'placencia') return null;
  return `output-coast-placencia-${resolution}-ecosys-services-${scenarioId}`;
}

// ---------------------------------------------------------------------------
// Payload normalisation
// ---------------------------------------------------------------------------

function payloadToRows(payload: RowPayload | undefined | null): CoastalScenarioRow[] {
  if (!payload) return [];
  if (Array.isArray((payload as { rows?: unknown }).rows)) {
    return (payload as { rows: CoastalScenarioRow[] }).rows;
  }
  const fc = payload as GeoJSON.FeatureCollection;
  if (fc?.type === 'FeatureCollection' && Array.isArray(fc.features)) {
    return fc.features
      .map((f) => (f.properties ?? null) as CoastalScenarioRow | null)
      .filter((r): r is CoastalScenarioRow => r !== null);
  }
  return [];
}

// ---------------------------------------------------------------------------
// Pure delta computation (exported for testability)
// ---------------------------------------------------------------------------

/**
 * Compute per-polygon delta: scenarioValue - basecaseValue.
 * A negative delta indicates improvement (lower value in scenario).
 *
 * @param scenarioRows   Rows from the scenario output dataset
 * @param basecaseRows   Rows from the basecase output dataset
 * @param valueField     The numeric field to compare (default: 'value')
 */
export function computeScenarioDelta(
  scenarioRows: CoastalScenarioRow[],
  basecaseRows: CoastalScenarioRow[],
  valueField = 'value',
): Map<string, number> {
  // Index basecase by polygon id
  const basecaseIndex = new Map<string, number>();
  for (const row of basecaseRows) {
    const id =
      row['Polygon_ID'] !== undefined && row['Polygon_ID'] !== null
        ? String(row['Polygon_ID'])
        : null;
    if (id === null) continue;
    const val =
      typeof row[valueField] === 'number' ? (row[valueField] as number) : NaN;
    if (Number.isFinite(val)) {
      basecaseIndex.set(id, val);
    }
  }

  const deltas = new Map<string, number>();
  for (const row of scenarioRows) {
    const id =
      row['Polygon_ID'] !== undefined && row['Polygon_ID'] !== null
        ? String(row['Polygon_ID'])
        : null;
    if (id === null) continue;
    const scenarioVal =
      typeof row[valueField] === 'number' ? (row[valueField] as number) : NaN;
    if (!Number.isFinite(scenarioVal)) continue;
    const basecaseVal = basecaseIndex.get(id);
    if (basecaseVal === undefined) continue;
    deltas.set(id, scenarioVal - basecaseVal);
  }

  return deltas;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCoastalScenarioImpact(
  scenarioId: string | null,
  site: SiteId | null,
  resolution: CoastalResolution,
): UseCoastalScenarioImpactResult {
  const empty: UseCoastalScenarioImpactResult = {
    waveDeltas: new Map(),
    erosionDeltas: new Map(),
    servicesDeltas: new Map(),
    loading: false,
  };

  // When scenarioId is null, return empty immediately
  const shouldFetch = scenarioId !== null;
  const isBasecase = scenarioId === 'basecase';

  // Scenario dataset keys
  const waveScenarioKey =
    shouldFetch && !isBasecase ? waveDatasetId(site, resolution, scenarioId!) : null;
  const erosionScenarioKey =
    shouldFetch && !isBasecase ? erosionDatasetId(site, resolution, scenarioId!) : null;
  const servicesScenarioKey =
    shouldFetch && !isBasecase ? servicesDatasetId(site, resolution, scenarioId!) : null;

  // Basecase dataset keys (always needed when fetching)
  const waveBasecaseKey =
    shouldFetch ? waveDatasetId(site, resolution, 'basecase') : null;
  const erosionBasecaseKey =
    shouldFetch ? erosionDatasetId(site, resolution, 'basecase') : null;
  const servicesBasecaseKey =
    shouldFetch ? servicesDatasetId(site, resolution, 'basecase') : null;

  // Fan-out SWR calls
  const waveScenario = useSWR<FetcherResult<RowPayload>>(
    waveScenarioKey ? `/api/data/${waveScenarioKey}` : null,
    (u: string) => dataFetcher<RowPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const erosionScenario = useSWR<FetcherResult<RowPayload>>(
    erosionScenarioKey ? `/api/data/${erosionScenarioKey}` : null,
    (u: string) => dataFetcher<RowPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const servicesScenario = useSWR<FetcherResult<RowPayload>>(
    servicesScenarioKey ? `/api/data/${servicesScenarioKey}` : null,
    (u: string) => dataFetcher<RowPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const waveBasecase = useSWR<FetcherResult<RowPayload>>(
    waveBasecaseKey ? `/api/data/${waveBasecaseKey}` : null,
    (u: string) => dataFetcher<RowPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const erosionBasecase = useSWR<FetcherResult<RowPayload>>(
    erosionBasecaseKey ? `/api/data/${erosionBasecaseKey}` : null,
    (u: string) => dataFetcher<RowPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  const servicesBasecase = useSWR<FetcherResult<RowPayload>>(
    servicesBasecaseKey ? `/api/data/${servicesBasecaseKey}` : null,
    (u: string) => dataFetcher<RowPayload>(u),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  // If no scenarioId, skip everything
  if (!shouldFetch) {
    return empty;
  }

  const loading =
    waveBasecase.isLoading ||
    erosionBasecase.isLoading ||
    servicesBasecase.isLoading ||
    waveScenario.isLoading ||
    erosionScenario.isLoading ||
    servicesScenario.isLoading;

  if (loading) {
    return { ...empty, loading: true };
  }

  // Basecase self-delta: return 0 for all polygons that exist in basecase
  if (isBasecase) {
    const waveRows = payloadToRows(waveBasecase.data?.data);
    const erosionRows = payloadToRows(erosionBasecase.data?.data);
    const servicesRows = payloadToRows(servicesBasecase.data?.data);

    const toZeroMap = (rows: CoastalScenarioRow[]) => {
      const m = new Map<string, number>();
      for (const row of rows) {
        const id =
          row['Polygon_ID'] !== undefined && row['Polygon_ID'] !== null
            ? String(row['Polygon_ID'])
            : null;
        if (id !== null) m.set(id, 0);
      }
      return m;
    };

    return {
      waveDeltas: toZeroMap(waveRows),
      erosionDeltas: toZeroMap(erosionRows),
      servicesDeltas: toZeroMap(servicesRows),
      loading: false,
    };
  }

  // Normal scenario: compute deltas
  const waveDeltas = computeScenarioDelta(
    payloadToRows(waveScenario.data?.data),
    payloadToRows(waveBasecase.data?.data),
  );
  const erosionDeltas = computeScenarioDelta(
    payloadToRows(erosionScenario.data?.data),
    payloadToRows(erosionBasecase.data?.data),
  );
  const servicesDeltas = computeScenarioDelta(
    payloadToRows(servicesScenario.data?.data),
    payloadToRows(servicesBasecase.data?.data),
  );

  return {
    waveDeltas,
    erosionDeltas,
    servicesDeltas,
    loading: false,
  };
}
