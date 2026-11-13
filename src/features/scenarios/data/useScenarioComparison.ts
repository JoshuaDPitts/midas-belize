'use client';
import { useMemo } from 'react';
import type { SiteId } from '@/lib/data/types';
import type { ScenarioId } from '../matrix';
import { useCoastalScenarioImpact } from '@/lib/data/hooks/useCoastalScenarioImpact';
import { useScenarioImpact } from '@/lib/data/hooks/useScenarioImpact';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricDelta {
  /** Per-polygon delta values (B minus A). Map key is polygon ID. */
  polygonById: Map<string, number>;
  /** Site-aggregate delta (mean or sum, depending on metric). */
  siteAggregate: number;
}

export interface MetricTimeSeries {
  /** Time series for scenario A. */
  tA: number[];
  /** Time series for scenario B. */
  tB: number[];
  /** Time axis labels (ISO months or other). */
  timeAxis: string[];
}

export interface UseScenarioComparisonResult {
  /** Delta metrics keyed by metric ID (e.g., 'wave-attenuation', 'erosion-rate'). */
  deltas: Map<string, MetricDelta>;
  /** Time series keyed by metric ID. */
  timeSeries: Map<string, MetricTimeSeries>;
  loading: boolean;
  error: Error | null;
  /** Availability flags for each scenario. */
  availability: {
    aHasData: boolean;
    bHasData: boolean;
  };
}

export interface UseScenarioComparisonParams {
  site: SiteId | null;
  vertical: 'coastal' | 'watershed' | 'marine';
  scenarioA: ScenarioId | null;
  scenarioB: ScenarioId | null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * REQ-SC-019: Orchestrator that fetches A + B impacts per vertical and computes deltas.
 * 
 * Dispatch table:
 * - `coastal` → wraps `useCoastalScenarioImpact` × 2 (A and B)
 * - `watershed` → wraps `useScenarioImpact` × 2
 * - `marine` → returns stub with no data (compare not yet implemented)
 */
export function useScenarioComparison({
  site,
  vertical,
  scenarioA,
  scenarioB,
}: UseScenarioComparisonParams): UseScenarioComparisonResult {
  // Marine vertical stub (not yet implemented)
  if (vertical === 'marine') {
    return {
      deltas: new Map(),
      timeSeries: new Map(),
      loading: false,
      error: null,
      availability: { aHasData: false, bHasData: false },
    };
  }

  // Coastal dispatch
  if (vertical === 'coastal') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const impactA = useCoastalScenarioImpact(scenarioA, site, 'hires');
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const impactB = useCoastalScenarioImpact(scenarioB, site, 'hires');

    const deltas = useMemo(() => {
      const result = new Map<string, MetricDelta>();

      // Wave attenuation deltas
      const waveDelta = computeDelta(impactA.waveDeltas, impactB.waveDeltas);
      if (waveDelta) result.set('wave-attenuation', waveDelta);

      // Erosion rate deltas
      const erosionDelta = computeDelta(impactA.erosionDeltas, impactB.erosionDeltas);
      if (erosionDelta) result.set('erosion-rate', erosionDelta);

      // Ecosystem services deltas
      const servicesDelta = computeDelta(impactA.servicesDeltas, impactB.servicesDeltas);
      if (servicesDelta) result.set('ecosys-services', servicesDelta);

      return result;
    }, [impactA, impactB]);

    return {
      deltas,
      timeSeries: new Map(), // Coastal doesn't have time series yet
      loading: impactA.loading || impactB.loading,
      error: null,
      availability: {
        aHasData: impactA.waveDeltas.size > 0,
        bHasData: impactB.waveDeltas.size > 0,
      },
    };
  }

  // Watershed dispatch
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const impactA = useScenarioImpact(scenarioA);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const impactB = useScenarioImpact(scenarioB);

  const deltas = useMemo(() => {
    const result = new Map<string, MetricDelta>();

    // Watershed deltas
    const watershedDelta = computeDelta(impactA.watershedDeltas, impactB.watershedDeltas);
    if (watershedDelta) result.set('sediment', watershedDelta);

    // Coast deltas
    const coastDelta = computeDelta(impactA.coastDeltas, impactB.coastDeltas);
    if (coastDelta) result.set('erosion', coastDelta);

    return result;
  }, [impactA, impactB]);

  return {
    deltas,
    timeSeries: new Map(), // Watershed time series not yet implemented
    loading: impactA.loading || impactB.loading,
    error: impactA.error || impactB.error,
    availability: {
      aHasData: impactA.watershedDeltas.size > 0,
      bHasData: impactB.watershedDeltas.size > 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute delta (B - A) for each polygon and site aggregate.
 * Returns null if both maps are empty.
 */
function computeDelta(
  mapA: Map<string, number>,
  mapB: Map<string, number>,
): MetricDelta | null {
  const polygonById = new Map<string, number>();
  
  // Collect all polygon IDs from both scenarios
  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);
  
  for (const id of allIds) {
    const valA = mapA.get(id) ?? 0;
    const valB = mapB.get(id) ?? 0;
    polygonById.set(id, valB - valA);
  }

  if (polygonById.size === 0) return null;

  // Compute site aggregate as mean delta
  let sum = 0;
  for (const delta of polygonById.values()) {
    sum += delta;
  }
  const siteAggregate = sum / polygonById.size;

  return { polygonById, siteAggregate };
}
