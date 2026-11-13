import { describe, it, expect } from 'vitest';
import { restorationPotentialFactor } from '@/features/watershed/domain/nbs-ranking/factors/restoration-potential';
import type { WatershedPolygonContext } from '@/features/watershed/domain/nbs-ranking/_types';
import type { Feature, Polygon } from 'geojson';

function ctx(props: Record<string, unknown>): WatershedPolygonContext {
  const feature: Feature<Polygon> = {
    type: 'Feature',
    properties: props,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  };
  return { feature, properties: props };
}

describe('REQ-WS-019: restoration-potential factor', () => {
  it('exposes correct metadata', () => {
    expect(restorationPotentialFactor.id).toBe('restoration-potential');
    expect(restorationPotentialFactor.defaultWeight).toBe(1.0);
    expect(restorationPotentialFactor.direction).toBe('higher-better');
    expect(restorationPotentialFactor.unit).toBe('0..1');
  });

  it('returns the numeric Restoration_Potential when present', () => {
    expect(restorationPotentialFactor.compute(ctx({ Restoration_Potential: 0.55 }))).toBe(0.55);
  });

  it('returns null when Restoration_Potential is missing', () => {
    expect(restorationPotentialFactor.compute(ctx({ Name: 'X' }))).toBeNull();
  });

  it('returns null when Restoration_Potential is non-numeric', () => {
    expect(restorationPotentialFactor.compute(ctx({ Restoration_Potential: 'unknown' }))).toBeNull();
  });
});
