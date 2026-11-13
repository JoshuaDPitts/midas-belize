import { describe, it, expect } from 'vitest';
import {
  computeK,
  permeabilityFromTexture,
  structureFromSoc,
} from '@/../scripts/pre-process/rusle/factors/k-wischmeier';

describe('rusle/factors/k-wischmeier', () => {
  describe('computeK', () => {
    it('returns 0 for pure sand (M = 0)', () => {
      // pure sand: silt 0, vf-sand 0, clay 0 -> M = (0+0) * 100 = 0
      const k = computeK({
        sand_pct: 100,
        silt_pct: 0,
        clay_pct: 0,
        vf_sand_pct: 0,
        om_pct: 1,
        structure: 1,
        permeability: 1,
      });
      // Structure (1-2)=-1 and Permeability (1-3)=-2 contributions push the
      // raw 100·K negative; computeK clamps to 0 to keep K physically valid.
      expect(k).toBe(0);
    });

    it('produces a K within the expected SI range for a silt loam', () => {
      // Classic Wischmeier-Smith reference soil: silty surface, moderate OM.
      // SI K for silt loams typically falls in 0.03 .. 0.05.
      const k = computeK({
        sand_pct: 20,
        silt_pct: 60,
        clay_pct: 20,
        vf_sand_pct: 6,
        om_pct: 2,
        structure: 2,
        permeability: 3,
      });
      expect(k).toBeGreaterThan(0.02);
      expect(k).toBeLessThan(0.07);
    });

    it('clamps OM to the 0..12 band used by the nomograph', () => {
      // OM beyond 12% breaks the nomograph; clamp avoids negative K spikes.
      const kHigh = computeK({
        sand_pct: 30,
        silt_pct: 40,
        clay_pct: 30,
        om_pct: 99,
        structure: 2,
        permeability: 3,
      });
      const kCap = computeK({
        sand_pct: 30,
        silt_pct: 40,
        clay_pct: 30,
        om_pct: 12,
        structure: 2,
        permeability: 3,
      });
      expect(kHigh).toBeCloseTo(kCap, 6);
    });

    it('K rises with finer texture (silt up, clay down) holding OM constant', () => {
      const sandy = computeK({
        sand_pct: 60,
        silt_pct: 20,
        clay_pct: 20,
        om_pct: 2,
        structure: 3,
        permeability: 2,
      });
      const silty = computeK({
        sand_pct: 20,
        silt_pct: 60,
        clay_pct: 20,
        om_pct: 2,
        structure: 3,
        permeability: 2,
      });
      expect(silty).toBeGreaterThan(sandy);
    });

    it('K falls as organic-matter rises (holding texture constant)', () => {
      const base = {
        sand_pct: 30,
        silt_pct: 50,
        clay_pct: 20,
        structure: 2 as const,
        permeability: 3 as const,
      };
      const lowOm = computeK({ ...base, om_pct: 0.5 });
      const highOm = computeK({ ...base, om_pct: 6 });
      expect(highOm).toBeLessThan(lowOm);
    });

    it('defaults very-fine-sand to 30% of total sand when omitted', () => {
      const k1 = computeK({
        sand_pct: 40,
        silt_pct: 30,
        clay_pct: 30,
        om_pct: 2,
        structure: 2,
        permeability: 3,
      });
      const k2 = computeK({
        sand_pct: 40,
        silt_pct: 30,
        clay_pct: 30,
        vf_sand_pct: 12, // 30% of 40
        om_pct: 2,
        structure: 2,
        permeability: 3,
      });
      expect(k1).toBeCloseTo(k2, 6);
    });

    it('non-finite inputs are coerced to 0 without throwing', () => {
      const k = computeK({
        sand_pct: NaN,
        silt_pct: 50,
        clay_pct: 20,
        om_pct: Infinity,
        structure: 2,
        permeability: 3,
      });
      expect(Number.isFinite(k)).toBe(true);
      expect(k).toBeGreaterThanOrEqual(0);
    });
  });

  describe('permeabilityFromTexture', () => {
    it('classifies pure sand as rapid (1)', () => {
      expect(permeabilityFromTexture(95, 2)).toBe(1);
    });
    it('classifies heavy clay as very slow (6)', () => {
      expect(permeabilityFromTexture(10, 65)).toBe(6);
    });
    it('classifies silt loam as moderate (3)', () => {
      expect(permeabilityFromTexture(20, 18)).toBe(3);
    });
  });

  describe('structureFromSoc', () => {
    it('high SOC (>=4%) is very-fine granular (1)', () => {
      expect(structureFromSoc(5)).toBe(1);
    });
    it('low SOC is massive (4)', () => {
      expect(structureFromSoc(0.3)).toBe(4);
    });
    it('zero or non-finite SOC is massive (4)', () => {
      expect(structureFromSoc(0)).toBe(4);
      expect(structureFromSoc(NaN)).toBe(4);
    });
  });
});
