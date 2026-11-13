import { describe, it, expect } from 'vitest';
import { areaFactor } from '@/features/watershed/domain/nbs-ranking/factors/area';
import type { WatershedPolygonContext } from '@/features/watershed/domain/nbs-ranking/_types';
import type { Feature, Polygon } from 'geojson';

function ctx(coords: number[][][]): WatershedPolygonContext {
  const feature: Feature<Polygon> = {
    type: 'Feature',
    properties: { Name: 'X' },
    geometry: { type: 'Polygon', coordinates: coords },
  };
  return { feature, properties: feature.properties as Record<string, unknown> };
}

describe('REQ-WS-020: area factor', () => {
  it('exposes correct metadata', () => {
    expect(areaFactor.id).toBe('area');
    expect(areaFactor.defaultWeight).toBe(0.5);
    expect(areaFactor.direction).toBe('higher-better');
    expect(areaFactor.unit).toBe('log km²');
  });

  it('returns finite log(km²) for a reasonable polygon over Belize', () => {
    // ~10 km square at 16°N: 0.1° lng × 0.1° lat ~ 11 km × 11 km ~ 121 km²
    const coords = [[[-88.4, 16.5], [-88.3, 16.5], [-88.3, 16.6], [-88.4, 16.6], [-88.4, 16.5]]];
    const v = areaFactor.compute(ctx(coords));
    expect(v).not.toBeNull();
    expect(Number.isFinite(v!)).toBe(true);
    // log(~120) ≈ 4.8 — give it room
    expect(v!).toBeGreaterThan(4);
    expect(v!).toBeLessThan(6);
  });

  it('larger polygons score higher than smaller ones', () => {
    const small = ctx([[[-88.40, 16.50], [-88.39, 16.50], [-88.39, 16.51], [-88.40, 16.51], [-88.40, 16.50]]]);
    const large = ctx([[[-88.4, 16.5], [-88.2, 16.5], [-88.2, 16.7], [-88.4, 16.7], [-88.4, 16.5]]]);
    const a = areaFactor.compute(small)!;
    const b = areaFactor.compute(large)!;
    expect(b).toBeGreaterThan(a);
  });
});
