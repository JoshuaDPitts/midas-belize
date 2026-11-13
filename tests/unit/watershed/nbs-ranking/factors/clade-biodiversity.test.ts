import { describe, it, expect } from 'vitest';
import {
  cladeBiodiversityFactor,
  shannonIndex,
} from '@/features/watershed/domain/nbs-ranking/factors/clade-biodiversity';
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

describe('REQ-WS-023: clade-biodiversity factor', () => {
  it('exposes correct metadata', () => {
    expect(cladeBiodiversityFactor.id).toBe('clade-biodiversity');
    expect(cladeBiodiversityFactor.defaultWeight).toBe(0.5);
    expect(cladeBiodiversityFactor.direction).toBe('higher-better');
    expect(cladeBiodiversityFactor.unit).toBe('H');
  });

  describe('shannonIndex helper', () => {
    it('returns 0 for a monoculture (single clade)', () => {
      expect(shannonIndex([1.0])).toBe(0);
      expect(shannonIndex([0.95, 0])).toBe(0);
    });

    it('returns ln(n) for n equal-share clades (maximum diversity)', () => {
      const n = 4;
      const H = shannonIndex(new Array(n).fill(1 / n));
      expect(H).toBeCloseTo(Math.log(n), 6);
    });

    it('returns 0 for empty input', () => {
      expect(shannonIndex([])).toBe(0);
      expect(shannonIndex([0, 0, 0])).toBe(0);
    });

    it('normalises non-normalised fractions before computing H', () => {
      // 50, 50 should give the same H as 0.5, 0.5
      expect(shannonIndex([50, 50])).toBeCloseTo(Math.log(2), 6);
    });
  });

  describe('compute on polygon context', () => {
    it('reads clade_fractions object when present', () => {
      const v = cladeBiodiversityFactor.compute(ctx({ clade_fractions: { 1: 0.5, 2: 0.5 } }))!;
      expect(v).toBeCloseTo(Math.log(2), 6);
    });

    it('falls back to Clade_N_pct columns', () => {
      const v = cladeBiodiversityFactor.compute(
        ctx({ Clade_1_pct: 50, Clade_2_pct: 25, Clade_3_pct: 25 }),
      )!;
      // 0.5, 0.25, 0.25 → H = -0.5*ln(0.5) -0.25*ln(0.25) -0.25*ln(0.25) ≈ 1.0397
      expect(v).toBeCloseTo(1.0397, 3);
    });

    it('returns null when neither clade_fractions nor Clade_N_pct columns are present', () => {
      expect(cladeBiodiversityFactor.compute(ctx({ Name: 'X' }))).toBeNull();
    });
  });
});
