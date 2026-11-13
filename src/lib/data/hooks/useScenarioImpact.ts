'use client';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeSiteAtom } from '@/atoms';
import type { SiteId } from '../types';
import { useLayerData } from './useLayerData';

/** Each row from the per-polygon monthly erosion output datasets. The
 * publish pipeline emits one row per (polygon, month) with a tonnage
 * column. Other irrelevant columns (Days, JDAY End Month, source,
 * license) come along for the ride but the hook only needs the polygon
 * key + value. */
export interface ErosionMonthlyRow {
  MIMES_ID?: number | string;
  Name?: string;
  WATERSHED?: string;
  'T per month'?: number;
  T_per_month?: number;
  /** Some tables publish the value under different column names; the
   * normaliser accepts either. */
  T?: number;
  [k: string]: unknown;
}

export interface MarineImpactSummary {
  sediment_stressed_pct: number;
  lbc_attribution: number | null;
}

export interface UseScenarioImpactResult {
  /** Per-polygon Δ kg/yr (or t/yr) vs the base-case. Negative = scenario
   * improves erosion (less tonnage). Positive = scenario worsens it. */
  watershedDeltas: Map<string, number>;
  coastDeltas: Map<string, number>;
  marineImpact: MarineImpactSummary | null;
  loading: boolean;
  error: Error | null;
}

interface Payload {
  rows?: ErosionMonthlyRow[];
}

/** Aggregate (polygon × month) rows into a per-polygon annual total. The
 * polygon key resolution falls through MIMES_ID → Name → WATERSHED
 * (same order as polygonKeyOf elsewhere in the watershed vertical). */
export function sumTonnesByPolygon(rows: ErosionMonthlyRow[] | undefined | null): Map<string, number> {
  const out = new Map<string, number>();
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    const id =
      r.MIMES_ID !== undefined && r.MIMES_ID !== null && r.MIMES_ID !== ''
        ? r.MIMES_ID
        : r.Name !== undefined && r.Name !== ''
          ? r.Name
          : r.WATERSHED !== undefined && r.WATERSHED !== ''
            ? r.WATERSHED
            : null;
    if (id === null) continue;
    const key = String(id).replace(/\.0+$/, '');
    const tonnage =
      typeof r['T per month'] === 'number'
        ? r['T per month']
        : typeof r.T_per_month === 'number'
          ? r.T_per_month
          : typeof r.T === 'number'
            ? r.T
            : 0;
    out.set(key, (out.get(key) ?? 0) + tonnage);
  }
  return out;
}

/** Pure helper: subtract base from scenario for every polygon. When the
 * scenario set is missing a polygon present in base (or vice versa), the
 * difference is computed against 0 so the diff still appears (instead of
 * being silently dropped). */
export function deltaPerPolygon(
  base: Map<string, number>,
  scenario: Map<string, number>,
): Map<string, number> {
  const out = new Map<string, number>();
  const keys = new Set<string>([...base.keys(), ...scenario.keys()]);
  for (const k of keys) {
    out.set(k, (scenario.get(k) ?? 0) - (base.get(k) ?? 0));
  }
  return out;
}

const BASE_WATERSHED_DATASET = 'output-watershed-pl-erosion';

/** Compose scenario-output dataset ids for a given site + scenario. The
 * naming convention is not 100% uniform across the catalog (watershed has
 * a single output today; coast has -basecase / -log; marine has -bc /
 * -res / -deg / -wc). For v1, this composer just templates the scenario
 * id onto a watershed-specific suffix; missing datasets 404 cleanly and
 * the hook returns empty deltas + null marineImpact. */
function scenarioDatasetsFor(site: SiteId | null, scenarioId: string): {
  watershed: string;
  coast: string;
  marine: string;
} {
  return {
    watershed: `output-watershed-${site ?? 'pl'}-erosion-${scenarioId}`,
    coast: `output-coast-${site ?? 'placencia'}-hires-erosion-${scenarioId}`,
    marine: `output-marine-wave-attenuation-${scenarioId}`,
  };
}

export function useScenarioImpact(scenarioId: string | null): UseScenarioImpactResult {
  const site = useAtomValue(activeSiteAtom);

  // Always fetch the watershed base-case; deltas are computed against it.
  const base = useLayerData<Payload>(BASE_WATERSHED_DATASET);

  const sids = scenarioId ? scenarioDatasetsFor(site, scenarioId) : null;
  const ws = useLayerData<Payload>(sids?.watershed ?? null);
  const cs = useLayerData<Payload>(sids?.coast ?? null);
  const ms = useLayerData<Payload>(sids?.marine ?? null);

  const result = useMemo<UseScenarioImpactResult>(() => {
    if (!scenarioId) {
      return {
        watershedDeltas: new Map(),
        coastDeltas: new Map(),
        marineImpact: null,
        loading: base.loading,
        error: base.error,
      };
    }
    const baseByPoly = sumTonnesByPolygon(base.data?.rows);
    const wsByPoly = sumTonnesByPolygon(ws.data?.rows);
    const coastBaseByPoly = new Map<string, number>(); // base coast not split for v1
    const csByPoly = sumTonnesByPolygon(cs.data?.rows);

    // Marine impact is summarised only when the marine dataset is present.
    // Today the marine output is a coarse landcover series; until the
    // sediment-stress proxy lands, marineImpact stays null + we surface it
    // as "not available yet".
    const marineImpact: MarineImpactSummary | null = ms.data
      ? {
          sediment_stressed_pct: 0,
          lbc_attribution: null,
        }
      : null;

    return {
      watershedDeltas: deltaPerPolygon(baseByPoly, wsByPoly),
      coastDeltas: deltaPerPolygon(coastBaseByPoly, csByPoly),
      marineImpact,
      loading: base.loading || ws.loading || cs.loading || ms.loading,
      error: (base.error ?? ws.error ?? cs.error ?? ms.error ?? null) as Error | null,
    };
  }, [scenarioId, base.data, base.loading, base.error, ws.data, ws.loading, ws.error, cs.data, cs.loading, cs.error, ms.data, ms.loading, ms.error]);

  return result;
}
