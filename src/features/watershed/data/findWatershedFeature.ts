import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { WatershedJoinedRow } from '@/lib/data';

export type WatershedFeature = Feature<Polygon | MultiPolygon>;

export function polygonKeyOf(props: Record<string, unknown>): string | number | null {
  const raw = props.Name ?? props.WATERSHED ?? props.MIMES_ID;
  if (raw === undefined || raw === null || raw === '') return null;
  return raw as string | number;
}

function normaliseKey(v: string | number): string {
  return String(v).replace(/\.0+$/, '');
}

/** Build a `Name|WATERSHED|MIMES_ID` -> joined-row lookup from the
 * `useWatershedsForSite` joinedAttrs side-channel. */
export function indexJoinedRows(
  rows: WatershedJoinedRow[] | undefined | null,
): Map<string, WatershedJoinedRow> {
  const map = new Map<string, WatershedJoinedRow>();
  if (!rows) return map;
  for (const row of rows) {
    const key = polygonKeyOf(row as Record<string, unknown>);
    if (key !== null) map.set(normaliseKey(key), row);
  }
  return map;
}

/** Locate a watershed feature by polygon id and merge all joined-row
 * sources (NbS scores, RUSLE factors, anything else passed in) into the
 * returned feature's `properties`. Later sources win on key conflicts.
 * Returns null if the feature is not in the collection.
 *
 * This mirrors what `WatershedMapLayers.mergeJoinedAttrs` does for the map,
 * but operates on a single polygon lookup so domain-panel components don't
 * need to materialise the whole merged FeatureCollection. */
export function findWatershedFeature(
  geometry: FeatureCollection | null,
  joinedSources: (WatershedJoinedRow[] | undefined | null)[] | WatershedJoinedRow[] | undefined | null,
  featureId: string | number,
): WatershedFeature | null {
  if (!geometry) return null;
  const target = normaliseKey(featureId);

  // Back-compat: callers may pass a single rows array (Stage-3 sites:
  // `findWatershedFeature(geometry, joinedAttrs?.nbs, id)`) or an array of
  // rows arrays (multi-source: `[joinedAttrs?.nbs, joinedAttrs?.rusle]`).
  // Detect by checking whether *any* element of the outer array is itself
  // an array or null/undefined — that signals the multi-source form.
  let sources: (WatershedJoinedRow[] | undefined | null)[];
  if (joinedSources == null) {
    sources = [];
  } else if (Array.isArray(joinedSources)) {
    const looksMultiSource = joinedSources.every(
      (el) => el == null || Array.isArray(el),
    );
    sources = looksMultiSource
      ? (joinedSources as (WatershedJoinedRow[] | undefined | null)[])
      : [joinedSources as WatershedJoinedRow[]];
  } else {
    sources = [];
  }

  const indices = sources.map(indexJoinedRows);

  for (const f of geometry.features) {
    const key = polygonKeyOf((f.properties ?? {}) as Record<string, unknown>);
    if (key === null || normaliseKey(key) !== target) continue;
    if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') continue;

    const merged: Record<string, unknown> = { ...(f.properties ?? {}) };
    for (const idx of indices) {
      const row = idx.get(target);
      if (row) Object.assign(merged, row);
    }
    return { ...(f as WatershedFeature), properties: merged };
  }
  return null;
}
