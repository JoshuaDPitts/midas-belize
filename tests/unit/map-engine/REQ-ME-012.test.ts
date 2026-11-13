// tests/unit/map-engine/REQ-ME-012.test.ts
// ME-012 — pure scale-bar math.
import { describe, it, expect } from 'vitest';
import {
  metersPerPixel,
  chooseNiceDistance,
  computeScaleBar,
  formatDistance,
} from '@/lib/map/core/scaleBar';

describe('REQ-ME-012: metersPerPixel (Web Mercator)', () => {
  it('at the equator, zoom 0 = ~156 km/px', () => {
    const mpp = metersPerPixel(0, 0);
    // Standard Web Mercator equatorial ground resolution at zoom 0.
    expect(mpp).toBeGreaterThan(156_000);
    expect(mpp).toBeLessThan(157_000);
  });

  it('at the equator, zoom 8 is 256× smaller than zoom 0', () => {
    const z0 = metersPerPixel(0, 0);
    const z8 = metersPerPixel(0, 8);
    expect(z0 / z8).toBeCloseTo(256, 5);
  });

  it('shrinks with latitude (cos scaling): 60°N ≈ 0.5 × equatorial', () => {
    const eq = metersPerPixel(0,  10);
    const lat60 = metersPerPixel(60, 10);
    expect(lat60 / eq).toBeCloseTo(0.5, 2);
  });
});

describe('REQ-ME-012: chooseNiceDistance', () => {
  it('picks the largest step ≤ input from the nice-number ladder', () => {
    expect(chooseNiceDistance(1)).toBe(1);
    expect(chooseNiceDistance(3)).toBe(2);
    expect(chooseNiceDistance(7)).toBe(5);
    expect(chooseNiceDistance(15)).toBe(10);
    expect(chooseNiceDistance(75)).toBe(50);
    expect(chooseNiceDistance(1500)).toBe(1000);
    expect(chooseNiceDistance(75_000)).toBe(50_000);
  });

  it('returns smallest step (1) when input is below the ladder', () => {
    expect(chooseNiceDistance(0.5)).toBe(1);
  });

  it('returns 0 for zero / negative / NaN', () => {
    expect(chooseNiceDistance(0)).toBe(0);
    expect(chooseNiceDistance(-10)).toBe(0);
    expect(chooseNiceDistance(NaN)).toBe(0);
  });
});

describe('REQ-ME-012: computeScaleBar', () => {
  it('produces a label + bar width whose pixel width is ≤ target', () => {
    const out = computeScaleBar(17.25, 10, 100);
    expect(out.widthPx).toBeLessThanOrEqual(100);
    expect(out.widthPx).toBeGreaterThan(0);
    expect(out.label).toMatch(/(m|km)$/);
  });

  it('is monotonic — higher zoom → smaller distance on the same target', () => {
    const low  = computeScaleBar(17.25, 6,  100).meters;
    const high = computeScaleBar(17.25, 14, 100).meters;
    expect(high).toBeLessThan(low);
  });

  it('handles zero-width target gracefully', () => {
    const out = computeScaleBar(17.25, 10, 0);
    expect(out.widthPx).toBe(0);
    expect(out.meters).toBe(0);
  });
});

describe('REQ-ME-012: formatDistance', () => {
  it('under 1000 m → m label', () => {
    expect(formatDistance(50)).toBe('50 m');
    expect(formatDistance(999)).toBe('999 m');
  });

  it('1000 m and above → km label', () => {
    expect(formatDistance(1000)).toBe('1 km');
    expect(formatDistance(25_000)).toBe('25 km');
    expect(formatDistance(250_000)).toBe('250 km');
  });

  it('zero / negative → dash', () => {
    expect(formatDistance(0)).toBe('—');
    expect(formatDistance(-10)).toBe('—');
  });
});
