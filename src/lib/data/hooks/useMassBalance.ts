'use client';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { area as turfArea } from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { activeSiteAtom } from '@/atoms';
import type { SiteId } from '../types';
import { useWatershedsForSite } from './useWatershedsForSite';
import { indexJoinedRows, polygonKeyOf } from '@/features/watershed/data/findWatershedFeature';

export interface MassBalanceSource {
  polygonId: string;
  name: string;
  /** Annual sediment yield in tonnes per year, derived from
   * `A_t_ha_yr × area_ha` using the joined RUSLE factors. */
  tPerYr: number;
}

export interface MassBalanceFates {
  /** Coastal deposition (sediment retained near the shoreline). */
  coastal: number;
  /** Nearshore export (sediment carried into nearshore waters). */
  nearshore: number;
  /** Offshore export (sediment escaping past the nearshore zone). */
  offshore: number;
}

export interface MassBalanceResult {
  sources: MassBalanceSource[];
  transport: { drainage_t_per_yr: number };
  fates: MassBalanceFates;
  total: number;
  /** Sediment delivery ratio applied (kg-per-yr × ratio reaches downstream).
   * 0.4 default matches the spec; flagged for content review. */
  deliveryRatio: number;
  loading: boolean;
  error: Error | null;
}

/** Default delivery ratio (fraction of source yield that reaches the
 * coast). 0.4 is the watershed-vertical content-review default; the spec
 * notes this should be refined once the catchment-specific sediment
 * delivery ratio is sourced from literature. */
export const DEFAULT_DELIVERY_RATIO = 0.4;

/** Fates split as fractions of the *delivered* sediment that reach each
 * destination. Per the design doc, the default coast / nearshore /
 * offshore split is 60 / 30 / 10. Content-review-pending. */
export const DEFAULT_FATES_SPLIT: MassBalanceFates = {
  coastal: 0.6,
  nearshore: 0.3,
  offshore: 0.1,
};

interface ComputeInputs {
  features: Feature<Polygon | MultiPolygon>[];
  joinedRusle: { rusle?: Array<Record<string, unknown>> } | null;
}

/** Pure helper: walks the merged watershed features + RUSLE join and
 * returns the per-polygon yield list. Sources are sorted by yield
 * descending so the Sankey reads the largest contributors first. */
export function computeSources({
  features,
  joinedRusle,
}: ComputeInputs): MassBalanceSource[] {
  const rusleByKey = indexJoinedRows(joinedRusle?.rusle ?? null);
  const sources: MassBalanceSource[] = [];
  for (const f of features) {
    if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') continue;
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const key = polygonKeyOf(props);
    if (key === null) continue;
    const normalisedKey = String(key).replace(/\.0+$/, '');
    const rusleRow = rusleByKey.get(normalisedKey) as Record<string, unknown> | undefined;
    const A = rusleRow ? rusleRow.A_t_ha_yr : undefined;
    if (typeof A !== 'number' || !Number.isFinite(A)) continue;
    let areaHa = 0;
    try {
      areaHa = turfArea(f as Feature<Polygon | MultiPolygon>) / 10_000;
    } catch {
      continue;
    }
    const tPerYr = A * areaHa;
    if (!Number.isFinite(tPerYr) || tPerYr <= 0) continue;
    sources.push({
      polygonId: normalisedKey,
      name: String(key),
      tPerYr,
    });
  }
  sources.sort((a, b) => b.tPerYr - a.tPerYr);
  return sources;
}

/** Pure helper: compute the transport + fates given a source list and
 * a delivery ratio. Exported so the Sankey component can also call it
 * without re-hooking. */
export function computeFates(
  sources: MassBalanceSource[],
  deliveryRatio: number = DEFAULT_DELIVERY_RATIO,
  split: MassBalanceFates = DEFAULT_FATES_SPLIT,
): { total: number; transport: number; fates: MassBalanceFates } {
  const total = sources.reduce((s, x) => s + x.tPerYr, 0);
  const transport = total * deliveryRatio;
  return {
    total,
    transport,
    fates: {
      coastal: transport * split.coastal,
      nearshore: transport * split.nearshore,
      offshore: transport * split.offshore,
    },
  };
}

interface UseMassBalanceOpts {
  /** Override the default 0.4 delivery ratio. */
  deliveryRatio?: number;
  /** Override the default 60/30/10 fates split. */
  fatesSplit?: MassBalanceFates;
}

export function useMassBalance(opts: UseMassBalanceOpts = {}): MassBalanceResult {
  const site = useAtomValue(activeSiteAtom);
  return useMassBalanceForSite(site, opts);
}

/** Same as useMassBalance() but takes an explicit site argument — useful
 * for cross-site analysis (e.g. the WS-039 LBC marine-impact pull from
 * Placencia's upstream balance). */
export function useMassBalanceForSite(
  site: SiteId | null,
  opts: UseMassBalanceOpts = {},
): MassBalanceResult {
  const { geometry, joinedAttrs, loading, error } = useWatershedsForSite(site);
  const deliveryRatio = opts.deliveryRatio ?? DEFAULT_DELIVERY_RATIO;
  const split = opts.fatesSplit ?? DEFAULT_FATES_SPLIT;

  return useMemo<MassBalanceResult>(() => {
    if (!geometry) {
      return {
        sources: [],
        transport: { drainage_t_per_yr: 0 },
        fates: { coastal: 0, nearshore: 0, offshore: 0 },
        total: 0,
        deliveryRatio,
        loading,
        error,
      };
    }
    const features = geometry.features.filter(
      (f): f is Feature<Polygon | MultiPolygon> =>
        f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon',
    );
    const sources = computeSources({ features, joinedRusle: joinedAttrs });
    const fates = computeFates(sources, deliveryRatio, split);
    return {
      sources,
      transport: { drainage_t_per_yr: fates.transport },
      fates: fates.fates,
      total: fates.total,
      deliveryRatio,
      loading,
      error,
    };
  }, [geometry, joinedAttrs, deliveryRatio, split, loading, error]);
}
