import { describe, it, expect } from 'vitest';
import { nbsToRgba } from '@/features/marine/map/nbsColorScale';
import { dominantCladeRgba } from '@/features/marine/map/cladeColorScale';
import { restorationToRgba } from '@/features/marine/map/restorationColorScale';

describe('nbsToRgba', () => {
  it('clamps below-min scores to the low end of the ramp', () => {
    const rgba = nbsToRgba(0.1, { min: 0.2, max: 0.8 });
    expect(rgba[3]).toBe(180);
  });
  it('clamps above-max scores to the high end of the ramp', () => {
    const rgba = nbsToRgba(2, { min: 0.2, max: 0.8 });
    expect(rgba[3]).toBe(180);
  });
  it('returns a deterministic color for the same input', () => {
    const a = nbsToRgba(0.5, { min: 0, max: 1 });
    const b = nbsToRgba(0.5, { min: 0, max: 1 });
    expect(a).toEqual(b);
  });
  it('returns a hatch-pattern marker for null/undefined scores', () => {
    expect(nbsToRgba(null as unknown as number, { min: 0, max: 1 })).toEqual([100, 100, 100, 100]);
    expect(nbsToRgba(NaN, { min: 0, max: 1 })).toEqual([100, 100, 100, 100]);
  });
  it('different scores produce different colors', () => {
    const lo = nbsToRgba(0.2, { min: 0, max: 1 });
    const hi = nbsToRgba(0.8, { min: 0, max: 1 });
    expect(lo).not.toEqual(hi);
  });
});

describe('dominantCladeRgba', () => {
  it('returns a viz token color keyed off the highest Clade_N_pct', () => {
    const props = { Clade_1_pct: 0.1, Clade_2_pct: 0.5, Clade_3_pct: 0.4 };
    const rgba = dominantCladeRgba(props);
    expect(rgba.length).toBe(4);
    expect(rgba[3]).toBe(180);
  });
  it('returns the hatch marker when no clade columns are present', () => {
    expect(dominantCladeRgba({})).toEqual([100, 100, 100, 100]);
  });
  it('different dominant clades produce different colors', () => {
    const a = dominantCladeRgba({ Clade_1_pct: 0.9 });
    const b = dominantCladeRgba({ Clade_2_pct: 0.9 });
    expect(a).not.toEqual(b);
  });
});

describe('restorationToRgba', () => {
  it('produces a different color per score across the range', () => {
    const lo = restorationToRgba(0.1, { min: 0, max: 1 });
    const hi = restorationToRgba(0.9, { min: 0, max: 1 });
    expect(lo).not.toEqual(hi);
  });
  it('returns the hatch marker on missing data', () => {
    expect(restorationToRgba(undefined as unknown as number, { min: 0, max: 1 })).toEqual([100, 100, 100, 100]);
  });
});
