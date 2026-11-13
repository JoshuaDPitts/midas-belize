import { describe, it, expect } from 'vitest';
import { vulnerabilityEncoder, mangroveEncoder, scenarioDeltaEncoder } from '@/features/coastal/map/encoders';

describe('REQ-CO-006: Coastal encoders', () => {
  it('vulnerabilityEncoder: green at V=0, coral at V=1', () => {
    const low = vulnerabilityEncoder({ vulnerability: 0 });
    expect(low[1]).toBeGreaterThan(low[0]); // green channel > red
    const high = vulnerabilityEncoder({ vulnerability: 1 });
    expect(high[0]).toBeGreaterThan(high[1]); // red > green
  });
  it('mangroveEncoder: green at coverage=1, amber at coverage=0', () => {
    const full = mangroveEncoder({ Mangrove_Pct_Total: 100 });
    expect(full[1]).toBeGreaterThan(150); // strong green
    const none = mangroveEncoder({ Mangrove_Pct_Total: 0 });
    expect(none[0]).toBeGreaterThan(200); // amber/red
  });
  it('scenarioDeltaEncoder: green for negative delta, coral for positive', () => {
    const improved = scenarioDeltaEncoder({ delta: -0.5 });
    expect(improved[1]).toBeGreaterThan(improved[0]);
    const degraded = scenarioDeltaEncoder({ delta: 0.5 });
    expect(degraded[0]).toBeGreaterThan(degraded[1]);
  });
  it('all encoders return muted gray for missing values', () => {
    expect(vulnerabilityEncoder({})).toEqual([120, 120, 120, 180]);
    expect(mangroveEncoder({})).toEqual([120, 120, 120, 180]);
    expect(scenarioDeltaEncoder({})).toEqual([120, 120, 120, 180]);
  });
});
