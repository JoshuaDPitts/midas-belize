import { describe, it, expect } from 'vitest';
import { computeVulnerability, rankByVulnerability } from '@/lib/data/hooks/useCoastalVulnerability';

describe('REQ-CO-004: useCoastalVulnerability', () => {
  it('V = urban * (1 - mangrove) for valid inputs', () => {
    expect(computeVulnerability(0.6, 0.3)).toBeCloseTo(0.42, 5);
  });
  it('V = 0 when urban is 0', () => {
    expect(computeVulnerability(0, 0.8)).toBe(0);
  });
  it('V = 0 when mangrove is 1 (full coverage)', () => {
    expect(computeVulnerability(0.5, 1)).toBe(0);
  });
  it('ranks polygons by V descending', () => {
    const polygons = [
      { id: 'A', urbanRatio: 0.2, mangroveCoverage: 0.8 },
      { id: 'B', urbanRatio: 0.6, mangroveCoverage: 0.1 },
      { id: 'C', urbanRatio: 0.4, mangroveCoverage: 0.5 },
    ];
    const ranked = rankByVulnerability(polygons);
    expect(ranked[0].id).toBe('B');
    expect(ranked[2].id).toBe('A');
  });
  it('handles missing urbanRatio as 0', () => {
    expect(computeVulnerability(NaN, 0.5)).toBe(0);
  });
  it('handles missing mangroveCoverage as 0', () => {
    expect(computeVulnerability(0.5, NaN)).toBeCloseTo(0.5, 5);
  });
});
