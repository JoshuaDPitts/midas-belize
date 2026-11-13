import { describe, it, expect } from 'vitest';
import { downstreamSedimentFactor } from '@/features/watershed/domain/nbs-ranking/factors/downstream-sediment';
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

describe('REQ-WS-022: downstream-sediment factor (stubbed)', () => {
  it('exposes correct metadata', () => {
    expect(downstreamSedimentFactor.id).toBe('downstream-sediment');
    expect(downstreamSedimentFactor.defaultWeight).toBe(0.5);
    expect(downstreamSedimentFactor.direction).toBe('higher-better');
    expect(downstreamSedimentFactor.unit).toBe('t/yr');
  });

  it('reads the cached downstream_sediment_t_per_yr when present (WS-040 follow-up)', () => {
    expect(
      downstreamSedimentFactor.compute(ctx({ downstream_sediment_t_per_yr: 42 })),
    ).toBe(42);
  });

  it('falls back to A_t_ha_yr when the cached field is absent', () => {
    expect(downstreamSedimentFactor.compute(ctx({ A_t_ha_yr: 1.7 }))).toBe(1.7);
  });

  it('returns null when neither cached field nor A_t_ha_yr are present', () => {
    expect(downstreamSedimentFactor.compute(ctx({ Name: 'A' }))).toBeNull();
  });

  it('returns null for non-finite A values', () => {
    expect(downstreamSedimentFactor.compute(ctx({ A_t_ha_yr: NaN }))).toBeNull();
  });
});
