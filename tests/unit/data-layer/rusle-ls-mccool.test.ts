import { describe, it, expect } from 'vitest';
import {
  computeLS,
  meanLS,
} from '@/../scripts/pre-process/rusle/factors/ls-mccool';

describe('rusle/factors/ls-mccool', () => {
  describe('computeLS', () => {
    it('returns 0 for zero slope length', () => {
      expect(computeLS({ slopeLength_m: 0, slopeRise_pct: 10 })).toBe(0);
    });

    it('returns 0 for zero slope (flat)', () => {
      expect(computeLS({ slopeLength_m: 100, slopeRise_pct: 0 })).toBe(0);
    });

    it('produces an LS in the expected band for a moderate hillslope (5% slope, λ=50m)', () => {
      // McCool reference: 5% slope * 50 m -> LS ~ 0.7 .. 1.5 (S branch < 9%)
      const ls = computeLS({ slopeLength_m: 50, slopeRise_pct: 5 });
      expect(ls).toBeGreaterThan(0.3);
      expect(ls).toBeLessThan(2.5);
    });

    it('LS rises monotonically with slope length (steepness fixed)', () => {
      const short = computeLS({ slopeLength_m: 22.13, slopeRise_pct: 9 });
      const medium = computeLS({ slopeLength_m: 100, slopeRise_pct: 9 });
      const long = computeLS({ slopeLength_m: 300, slopeRise_pct: 9 });
      expect(medium).toBeGreaterThan(short);
      expect(long).toBeGreaterThan(medium);
    });

    it('LS jumps at the 9% slope-class boundary (S branch switch)', () => {
      // The McCool S formula has two branches that join continuously at 9%.
      // We exercise both and confirm the answer is continuous within a few %
      // (the formulas are designed to meet, not cross, at the boundary).
      const justBelow = computeLS({ slopeLength_m: 100, slopeRise_pct: 8.9 });
      const justAbove = computeLS({ slopeLength_m: 100, slopeRise_pct: 9.1 });
      expect(Math.abs(justAbove - justBelow) / justBelow).toBeLessThan(0.05);
    });

    it('returns LS = 1 (approximately) for the unit plot (λ=22.13 m, 9% slope)', () => {
      // 22.13 m × 9% is RUSLE's reference plot; LS is defined to be ~1 there.
      const ls = computeLS({ slopeLength_m: 22.13, slopeRise_pct: 9 });
      expect(ls).toBeGreaterThan(0.85);
      expect(ls).toBeLessThan(1.15);
    });
  });

  describe('meanLS', () => {
    it('returns 0 for an empty cell list', () => {
      expect(meanLS([])).toBe(0);
    });

    it('weights LS by cell area', () => {
      const flat = { slopeLength_m: 100, slopeRise_pct: 1, area_m2: 900 };
      const steep = { slopeLength_m: 100, slopeRise_pct: 20, area_m2: 100 };
      const weighted = meanLS([flat, steep]);
      const lsFlat = computeLS(flat);
      const lsSteep = computeLS(steep);
      const expected = (lsFlat * 900 + lsSteep * 100) / 1000;
      expect(weighted).toBeCloseTo(expected, 6);
    });

    it('skips cells with zero area', () => {
      const real = { slopeLength_m: 100, slopeRise_pct: 5, area_m2: 1000 };
      const zero = { slopeLength_m: 100, slopeRise_pct: 50, area_m2: 0 };
      expect(meanLS([real, zero])).toBeCloseTo(computeLS(real), 6);
    });
  });
});
