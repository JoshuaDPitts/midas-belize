import { describe, it, expect } from 'vitest';
import { mangroveGapFactor } from '@/features/watershed/domain/nbs-ranking/factors/mangrove-gap';
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

describe('REQ-WS-022: mangrove-gap factor', () => {
  it('exposes correct metadata', () => {
    expect(mangroveGapFactor.id).toBe('mangrove-gap');
    expect(mangroveGapFactor.defaultWeight).toBe(0.5);
    expect(mangroveGapFactor.direction).toBe('higher-better');
  });

  it('computes 1 - (Mangrove_Pct_Total / 100)', () => {
    expect(mangroveGapFactor.compute(ctx({ Mangrove_Pct_Total: 20 }))).toBeCloseTo(0.8, 6);
    expect(mangroveGapFactor.compute(ctx({ Mangrove_Pct_Total: 100 }))).toBe(0);
    expect(mangroveGapFactor.compute(ctx({ Mangrove_Pct_Total: 0 }))).toBe(1);
  });

  it('clamps out-of-range inputs to [0, 1]', () => {
    expect(mangroveGapFactor.compute(ctx({ Mangrove_Pct_Total: 120 }))).toBe(0);
    expect(mangroveGapFactor.compute(ctx({ Mangrove_Pct_Total: -10 }))).toBe(1);
  });

  it('returns null when Mangrove_Pct_Total is missing', () => {
    expect(mangroveGapFactor.compute(ctx({ Name: 'X' }))).toBeNull();
  });
});
