// src/lib/map/interaction/queries.ts
// Pure query math for ME-008. `queryAt`, `queryInBbox`, `queryAlongLine`.
// These take pre-collected feature-hit arrays from MapLibre's
// `queryRenderedFeatures` plus optional layer metadata and compute the shape
// the showcase UI consumes.
//
// Kept pure so unit tests don't need jsdom/MapLibre.

import type { FeatureHit } from '@/atoms';
import type { LngLat } from '@/lib/map/core/constants';
import type { AreaSummary, NumericStats, TransectProfile, TransectSample } from '@/atoms';

/** Order hits top-to-bottom by z-order given a known layer order (first = bottom). */
export function queryAt(hits: FeatureHit[], layerOrder: string[]): FeatureHit[] {
  const rank = new Map(layerOrder.map((id, i) => [id, i]));
  return [...hits].sort((a, b) => (rank.get(b.layerId) ?? 0) - (rank.get(a.layerId) ?? 0));
}

/** Compute per-layer summaries for a batch of feature hits inside a bbox. */
export function queryInBbox(hits: FeatureHit[]): AreaSummary[] {
  const byLayer = new Map<string, FeatureHit[]>();
  for (const h of hits) {
    const list = byLayer.get(h.layerId) ?? [];
    list.push(h);
    byLayer.set(h.layerId, list);
  }
  const out: AreaSummary[] = [];
  for (const [layerId, features] of byLayer) {
    out.push({
      layerId,
      count: features.length,
      numeric: numericStats(features.map((f) => f.properties)),
    });
  }
  return out;
}

/** Aggregate numeric attributes across a set of property bags. */
export function numericStats(props: Record<string, unknown>[]): Record<string, NumericStats> {
  const out: Record<string, NumericStats> = {};
  if (props.length === 0) return out;
  // Collect numeric keys from the first record; subsequent records must have
  // a numeric value at that key to contribute.
  const numericKeys: string[] = [];
  for (const [k, v] of Object.entries(props[0])) {
    if (typeof v === 'number' && Number.isFinite(v)) numericKeys.push(k);
  }
  for (const k of numericKeys) {
    const vals: number[] = [];
    for (const p of props) {
      const v = p[k];
      if (typeof v === 'number' && Number.isFinite(v)) vals.push(v);
    }
    if (vals.length === 0) continue;
    const sum = vals.reduce((a, b) => a + b, 0);
    const mean = sum / vals.length;
    let min = vals[0];
    let max = vals[0];
    for (const v of vals) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const variance = vals.reduce((a, v) => a + (v - mean) * (v - mean), 0) / vals.length;
    out[k] = { count: vals.length, sum, mean, min, max, stddev: Math.sqrt(variance) };
  }
  return out;
}

/** Haversine distance in kilometers between two [lng, lat] points. */
export function haversineKm(a: LngLat, b: LngLat): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Linear interpolation in lng/lat space (adequate for short transects in
 *  Belize — great-circle divergence is < 0.1% at these scales). */
function lerpLngLat(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Evenly-spaced samples between two points. Returns the sample coords +
 *  the distance-from-start in km. `n` is the sample count (≥ 2). */
export function sampleLine(a: LngLat, b: LngLat, n: number): { lngLat: LngLat; distance: number }[] {
  const count = Math.max(2, n);
  const totalKm = haversineKm(a, b);
  const out: { lngLat: LngLat; distance: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    out.push({ lngLat: lerpLngLat(a, b, t), distance: t * totalKm });
  }
  return out;
}

/** Build a transect profile from per-sample layer lookups.
 *  `lookup(lngLat)` returns `{ [layerId]: { [attr]: number | null } }` for
 *  each interactive layer at that point, or an empty record. Vector hits
 *  along the whole line are supplied separately. */
export function queryAlongLine(
  a: LngLat,
  b: LngLat,
  n: number,
  lookup: (pt: LngLat) => Record<string, Record<string, number | null>>,
  vectorHits: FeatureHit[] = [],
): TransectProfile {
  const pts = sampleLine(a, b, n);
  const samples: TransectSample[] = pts.map((p) => ({
    distance: p.distance,
    lngLat: p.lngLat,
    values: lookup(p.lngLat),
  }));
  return { samples, vectorHits };
}
