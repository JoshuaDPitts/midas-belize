import { describe, it, expect } from 'vitest';
import {
  computeErosionRiskScore,
  erosionRiskEncoder,
} from '@/features/watershed/map/encoders';

describe('REQ-WS-009: computeErosionRiskScore', () => {
  it('uses R*K*LS when all three RUSLE factors present', () => {
    const score = computeErosionRiskScore({
      mean_r_factor: 100,
      K_factor: 0.2,
      LS_factor: 5,
      area_km2: 999,
    });
    expect(score).toBeCloseTo(100 * 0.2 * 5, 5);
  });

  it('falls back to R*area when K is missing', () => {
    const score = computeErosionRiskScore({ mean_r_factor: 200, LS_factor: 3, area_km2: 4 });
    expect(score).toBeCloseTo(800, 5);
  });

  it('falls back to R*area when LS is missing', () => {
    const score = computeErosionRiskScore({ mean_r_factor: 200, K_factor: 0.2, area_km2: 4 });
    expect(score).toBeCloseTo(800, 5);
  });

  it('defaults missing R to 0', () => {
    expect(computeErosionRiskScore({ K_factor: 0.2, LS_factor: 3, area_km2: 10 })).toBe(0);
  });

  it('defaults missing area to 1 in the fallback path', () => {
    expect(computeErosionRiskScore({ mean_r_factor: 50 })).toBe(50);
  });
});

describe('REQ-WS-009: erosionRiskEncoder', () => {
  it('emits the light-yellow endpoint at zero risk', () => {
    expect(erosionRiskEncoder({})).toEqual([255, 235, 150, 200]);
  });

  it('emits the deep-coral endpoint at saturation (score >= 5000)', () => {
    expect(erosionRiskEncoder({ mean_r_factor: 10000, area_km2: 1 })).toEqual([200, 40, 40, 200]);
  });

  it('produces an intermediate color between the endpoints at mid-range', () => {
    const mid = erosionRiskEncoder({ mean_r_factor: 2500, area_km2: 1 });
    expect(mid[0]).toBeGreaterThan(200);
    expect(mid[0]).toBeLessThan(255);
    expect(mid[1]).toBeLessThan(235);
    expect(mid[1]).toBeGreaterThan(40);
  });
});
