import { describe, it, expect } from 'vitest';
import { nbsEncoder } from '@/features/watershed/map/encoders';

describe('REQ-WS-006: NbS encoder', () => {
  it('returns a green-dominant color for positive NbS', () => {
    const c = nbsEncoder({ NbS_Score: 0.8 });
    expect(c[1]).toBeGreaterThan(c[0]);
  });

  it('returns a red-dominant color for negative NbS', () => {
    const c = nbsEncoder({ NbS_Score: -0.5 });
    expect(c[0]).toBeGreaterThan(c[1]);
  });

  it('returns muted gray when NbS missing', () => {
    const c = nbsEncoder({});
    expect(c[0]).toBe(120);
    expect(c[1]).toBe(120);
    expect(c[2]).toBe(120);
  });

  it('clamps NbS Score above +1 to the +1 green', () => {
    const c1 = nbsEncoder({ NbS_Score: 1 });
    const c2 = nbsEncoder({ NbS_Score: 5 });
    expect(c1).toEqual(c2);
  });

  it('clamps NbS Score below -1 to the -1 red', () => {
    const c1 = nbsEncoder({ NbS_Score: -1 });
    const c2 = nbsEncoder({ NbS_Score: -3 });
    expect(c1).toEqual(c2);
  });

  it('treats non-numeric NbS_Score as missing', () => {
    const c = nbsEncoder({ NbS_Score: '0.5' });
    expect(c[0]).toBe(120);
  });
});
