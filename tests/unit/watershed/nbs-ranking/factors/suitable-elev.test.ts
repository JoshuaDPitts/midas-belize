import { describe, it, expect } from 'vitest';
import { suitableElevFactor } from '@/features/watershed/domain/nbs-ranking/factors/suitable-elev';
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

describe('REQ-WS-021: suitable-elev factor', () => {
  it('exposes correct metadata', () => {
    expect(suitableElevFactor.id).toBe('suitable-elev');
    expect(suitableElevFactor.defaultWeight).toBe(0.5);
    expect(suitableElevFactor.direction).toBe('higher-better');
  });

  it('converts Suitable_Elev_Pct from percent (0..100) to fraction (0..1)', () => {
    expect(suitableElevFactor.compute(ctx({ Suitable_Elev_Pct: 25 }))).toBeCloseTo(0.25, 6);
    expect(suitableElevFactor.compute(ctx({ Suitable_Elev_Pct: 100 }))).toBe(1);
    expect(suitableElevFactor.compute(ctx({ Suitable_Elev_Pct: 0 }))).toBe(0);
  });

  it('returns null when Suitable_Elev_Pct is missing', () => {
    expect(suitableElevFactor.compute(ctx({ Name: 'X' }))).toBeNull();
  });
});
