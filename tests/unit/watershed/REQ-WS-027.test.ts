import { describe, it, expect } from 'vitest';
import { computeTimelineMonth } from '@/features/watershed/map/useRFactorTimelineSync';

describe('REQ-WS-027: rfactor timeline sync', () => {
  it('returns null when playback is paused (no auto-advance)', () => {
    expect(computeTimelineMonth(false, 5, 1, false)).toBeNull();
  });

  it('returns null when month atom is null (overlay disabled — leave it that way)', () => {
    expect(computeTimelineMonth(true, 5, null, false)).toBeNull();
  });

  it('returns null when manual override is set', () => {
    expect(computeTimelineMonth(true, 5, 1, true)).toBeNull();
  });

  it('cycles month from timeStep when playing + month set + no override', () => {
    // timeStep 0 → month 1, timeStep 1 → 2, ..., timeStep 11 → 12, timeStep 12 → 1
    expect(computeTimelineMonth(true, 0, 1, false)).toBe(1);
    expect(computeTimelineMonth(true, 5, 1, false)).toBe(6);
    expect(computeTimelineMonth(true, 11, 1, false)).toBe(12);
    expect(computeTimelineMonth(true, 12, 1, false)).toBe(1);
    expect(computeTimelineMonth(true, 23, 1, false)).toBe(12);
  });

  it('handles negative timeStep robustly (defensive)', () => {
    expect(computeTimelineMonth(true, -1, 1, false)).toBe(12);
  });
});
