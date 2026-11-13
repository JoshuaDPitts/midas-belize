import { describe, it, expect } from 'vitest';
import { conservationValueFactor } from '@/features/watershed/domain/nbs-ranking/factors/conservation-value';
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

describe('REQ-WS-020: conservation-value factor', () => {
  it('exposes correct metadata', () => {
    expect(conservationValueFactor.id).toBe('conservation-value');
    expect(conservationValueFactor.defaultWeight).toBe(1.0);
    expect(conservationValueFactor.direction).toBe('higher-better');
  });

  it('returns the numeric Conservation_Value when present', () => {
    expect(conservationValueFactor.compute(ctx({ Conservation_Value: 0.71 }))).toBe(0.71);
  });

  it('returns null when Conservation_Value is missing', () => {
    expect(conservationValueFactor.compute(ctx({ Name: 'X' }))).toBeNull();
  });
});
