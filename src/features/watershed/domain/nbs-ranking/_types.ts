import type { Feature, MultiPolygon, Polygon } from 'geojson';

/** A watershed polygon's runtime context as seen by a ranking factor: the
 * underlying GeoJSON feature plus the joined-merged property bag (NbS,
 * RUSLE, clade aggregates, etc.). Identical to the feature shape returned
 * by `findWatershedFeature` so factors can be unit-tested in isolation. */
export interface WatershedPolygonContext {
  feature: Feature<Polygon | MultiPolygon>;
  properties: Record<string, unknown>;
}

export type NbsFactorDirection = 'higher-better' | 'lower-better';

export interface NbsRankFactor<P = WatershedPolygonContext> {
  id: string;
  label: string;
  description: string;
  defaultWeight: number;
  direction: NbsFactorDirection;
  /** Display unit (e.g. 'km²', 'index', '0..1'). Optional. */
  unit?: string;
  /** Return null when the factor is not computable for this polygon (e.g.
   * upstream data missing). Null cells are excluded from the polygon's
   * weighted sum for this factor, but the polygon still ranks on its other
   * factors. */
  compute: (polygon: P) => number | null;
}

export interface PerFactorContribution {
  factorId: string;
  rawValue: number | null;
  zScore: number | null;
  weight: number;
  weightedZ: number; // 0 when rawValue/zScore is null
}

export interface RankedPolygon<P = WatershedPolygonContext> {
  polygon: P;
  score: number;
  perFactor: PerFactorContribution[];
}
