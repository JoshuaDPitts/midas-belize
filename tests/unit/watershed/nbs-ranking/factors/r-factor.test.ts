import { describe, it, expect } from 'vitest';
import { rFactorFactor } from '@/features/watershed/domain/nbs-ranking/factors/r-factor';
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

describe('REQ-WS-021: r-factor factor', () => {
  it('exposes correct metadata', () => {
    expect(rFactorFactor.id).toBe('r-factor');
    expect(rFactorFactor.defaultWeight).toBe(0.5);
    expect(rFactorFactor.direction).toBe('higher-better');
  });

  it('returns mean_r_factor when present (live data from rusle-factors join)', () => {
    expect(rFactorFactor.compute(ctx({ mean_r_factor: 11511 }))).toBe(11511);
  });

  it('returns null when mean_r_factor is missing', () => {
    expect(rFactorFactor.compute(ctx({ Name: 'X' }))).toBeNull();
  });

  it('returns null when mean_r_factor is non-finite', () => {
    expect(rFactorFactor.compute(ctx({ mean_r_factor: NaN }))).toBeNull();
    expect(rFactorFactor.compute(ctx({ mean_r_factor: Infinity }))).toBeNull();
  });
});
