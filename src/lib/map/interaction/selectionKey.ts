// src/lib/map/interaction/selectionKey.ts
// Stable selection keys across MapLibre + Deck.gl. Keyed `${layerId}:${featureId}`
// so the same feature selected from either renderer collapses to one entry.

export type FeatureId = string | number;

export function buildKey(layerId: string, featureId: FeatureId): string {
  return `${layerId}:${featureId}`;
}

export function parseKey(key: string): { layerId: string; featureId: string } | null {
  const idx = key.indexOf(':');
  if (idx < 0) return null;
  return { layerId: key.slice(0, idx), featureId: key.slice(idx + 1) };
}

/** Toggle `key` in `set`, returning a NEW Set (immutable). */
export function toggleKey(set: ReadonlySet<string>, key: string): Set<string> {
  const next = new Set(set);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}
