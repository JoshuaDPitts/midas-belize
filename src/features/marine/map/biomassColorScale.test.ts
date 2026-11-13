import { describe, expect, it } from 'vitest';
import { biomassToRgba } from './biomassColorScale';

describe('biomassToRgba', () => {
  it('returns the pale low-end color at value 0', () => {
    expect(biomassToRgba(0, 100)).toEqual([225, 240, 230, 200]);
  });

  it('returns the saturated high-end color at value === max', () => {
    expect(biomassToRgba(100, 100)).toEqual([16, 130, 96, 200]);
  });

  it('interpolates between the two ends for mid-range values', () => {
    const [r, g, b, a] = biomassToRgba(50, 100);
    expect(r).toBeLessThan(225);
    expect(r).toBeGreaterThan(16);
    expect(g).toBeLessThan(240);
    expect(g).toBeGreaterThan(130);
    expect(b).toBeLessThan(230);
    expect(b).toBeGreaterThan(96);
    expect(a).toBe(200);
  });

  it('clamps values above max to the high end', () => {
    expect(biomassToRgba(500, 100)).toEqual([16, 130, 96, 200]);
  });

  it('clamps negative values to the low end', () => {
    expect(biomassToRgba(-10, 100)).toEqual([225, 240, 230, 200]);
  });

  it('returns the hatch marker for null/undefined/NaN values', () => {
    const hatch: [number, number, number, number] = [100, 100, 100, 100];
    expect(biomassToRgba(null, 100)).toEqual(hatch);
    expect(biomassToRgba(undefined, 100)).toEqual(hatch);
    expect(biomassToRgba(NaN, 100)).toEqual(hatch);
  });

  it('falls back to a span of 1 when max is 0, avoiding division by zero', () => {
    expect(biomassToRgba(0, 0)).toEqual([225, 240, 230, 200]);
  });
});
