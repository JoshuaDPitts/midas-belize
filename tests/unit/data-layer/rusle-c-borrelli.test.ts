import { describe, it, expect } from 'vitest';
import {
  cFromWorldCoverClass,
  cFromClassFractions,
  WORLDCOVER_CLASSES,
} from '@/../scripts/pre-process/rusle/factors/c-borrelli';

describe('rusle/factors/c-borrelli', () => {
  describe('cFromWorldCoverClass', () => {
    it('returns near-zero C for closed-canopy tree cover', () => {
      const c = cFromWorldCoverClass(WORLDCOVER_CLASSES.TREE_COVER);
      expect(c).not.toBeNull();
      expect(c!).toBeLessThan(0.01);
    });

    it('returns near-zero C for mangrove (intertidal forest)', () => {
      expect(cFromWorldCoverClass(WORLDCOVER_CLASSES.MANGROVE)).toBeLessThan(0.01);
    });

    it('returns ~0.2 for generic cropland', () => {
      const c = cFromWorldCoverClass(WORLDCOVER_CLASSES.CROPLAND);
      expect(c).toBeCloseTo(0.2, 1);
    });

    it('returns 0 for water and ice (no soil exposed)', () => {
      expect(cFromWorldCoverClass(WORLDCOVER_CLASSES.WATER)).toBe(0);
      expect(cFromWorldCoverClass(WORLDCOVER_CLASSES.SNOW_ICE)).toBe(0);
    });

    it('returns the highest C for bare / sparse', () => {
      const cBare = cFromWorldCoverClass(WORLDCOVER_CLASSES.BARE_SPARSE)!;
      const cTree = cFromWorldCoverClass(WORLDCOVER_CLASSES.TREE_COVER)!;
      expect(cBare).toBeGreaterThan(cTree * 10);
    });

    it('returns null for unknown class codes', () => {
      expect(cFromWorldCoverClass(999)).toBeNull();
      expect(cFromWorldCoverClass(0)).toBeNull();
    });
  });

  describe('cFromClassFractions', () => {
    it('returns the per-class C for a 100%-tree polygon', () => {
      const c = cFromClassFractions({ [WORLDCOVER_CLASSES.TREE_COVER]: 1.0 });
      expect(c).toBeCloseTo(0.003, 4);
    });

    it('blends C for a mixed polygon (50% tree + 50% cropland)', () => {
      const c = cFromClassFractions({
        [WORLDCOVER_CLASSES.TREE_COVER]: 0.5,
        [WORLDCOVER_CLASSES.CROPLAND]: 0.5,
      });
      expect(c).toBeCloseTo((0.003 + 0.2) / 2, 4);
    });

    it('normalises fractions that do not sum to 1', () => {
      // 70% tree + 30% cropland that overall sum to 1.0
      const a = cFromClassFractions({
        [WORLDCOVER_CLASSES.TREE_COVER]: 0.7,
        [WORLDCOVER_CLASSES.CROPLAND]: 0.3,
      });
      // Same ratio expressed as 70/30 absolute pixel counts
      const b = cFromClassFractions({
        [WORLDCOVER_CLASSES.TREE_COVER]: 700,
        [WORLDCOVER_CLASSES.CROPLAND]: 300,
      });
      expect(a).toBeCloseTo(b, 6);
    });

    it('excludes unknown classes from the denominator', () => {
      // 100% unknown class -> C = 0 (totalWeight stays 0)
      expect(cFromClassFractions({ 999: 1.0 })).toBe(0);
    });

    it('handles non-finite and negative fractions by skipping them', () => {
      const c = cFromClassFractions({
        [WORLDCOVER_CLASSES.TREE_COVER]: 0.5,
        [WORLDCOVER_CLASSES.CROPLAND]: NaN,
        [WORLDCOVER_CLASSES.GRASSLAND]: -0.2,
        [WORLDCOVER_CLASSES.SHRUBLAND]: 0.5,
      });
      // Only TREE_COVER and SHRUBLAND survive; equal weights.
      expect(c).toBeCloseTo((0.003 + 0.05) / 2, 4);
    });

    it('returns 0 when the input is empty', () => {
      expect(cFromClassFractions({})).toBe(0);
    });
  });
});
