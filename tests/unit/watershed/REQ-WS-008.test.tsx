import { describe, it, expect } from 'vitest';
import { restorationEncoder } from '@/features/watershed/map/encoders';

describe('REQ-WS-008: restoration encoder', () => {
  it('returns the cyan endpoint at restoration=0', () => {
    expect(restorationEncoder({ Restoration_Potential: 0 })).toEqual([0, 188, 212, 200]);
  });

  it('returns the amber endpoint at restoration=1', () => {
    expect(restorationEncoder({ Restoration_Potential: 1 })).toEqual([255, 193, 7, 200]);
  });

  it('interpolates linearly at 0.5', () => {
    const mid = restorationEncoder({ Restoration_Potential: 0.5 });
    const cyan = restorationEncoder({ Restoration_Potential: 0 });
    const amber = restorationEncoder({ Restoration_Potential: 1 });
    expect(mid[0]).toBeGreaterThan(cyan[0]);
    expect(mid[0]).toBeLessThan(amber[0]);
    expect(mid[2]).toBeLessThan(cyan[2]);
    expect(mid[2]).toBeGreaterThan(amber[2]);
  });

  it('clamps values above 1 to the amber endpoint', () => {
    expect(restorationEncoder({ Restoration_Potential: 5 })).toEqual([255, 193, 7, 200]);
  });

  it('clamps values below 0 to the cyan endpoint', () => {
    expect(restorationEncoder({ Restoration_Potential: -2 })).toEqual([0, 188, 212, 200]);
  });

  it('returns muted gray when restoration value missing', () => {
    const c = restorationEncoder({});
    expect(c[0]).toBe(120);
    expect(c[1]).toBe(120);
    expect(c[2]).toBe(120);
  });

  it('treats non-numeric strings as missing', () => {
    const c = restorationEncoder({ Restoration_Potential: '0.7' });
    expect(c[0]).toBe(120);
  });
});
