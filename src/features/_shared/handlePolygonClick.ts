import { buildKey, toggleKey } from '@/lib/map/interaction/selectionKey';
import type { SelectedPolygonRef, FeatureHit } from '@/atoms';

export interface HandlePolygonClickArgs {
  ref: SelectedPolygonRef;
  properties: Record<string, unknown>;
  coordinate: [number, number] | number[] | undefined;
  shiftKey: boolean;
  currentSelection: Set<string>;
  setSelected: (r: SelectedPolygonRef | null) => void;
  setInspected: (h: FeatureHit | null) => void;
  setSelection: (s: Set<string>) => void;
}

export function handlePolygonClick(a: HandlePolygonClickArgs): void {
  const key = buildKey(a.ref.layerId, a.ref.featureId);
  if (a.shiftKey) {
    a.setSelection(toggleKey(a.currentSelection, key));
    return;
  }
  a.setSelected(a.ref);
  a.setInspected({
    layerId: a.ref.layerId,
    featureId: a.ref.featureId,
    properties: a.properties,
    lngLat: Array.isArray(a.coordinate) ? [a.coordinate[0], a.coordinate[1]] : [0, 0],
  });
  a.setSelection(new Set([key]));
}
