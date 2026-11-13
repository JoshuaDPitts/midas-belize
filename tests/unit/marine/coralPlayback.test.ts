import { describe, it, expect } from 'vitest';
import { nearestYear, nextYearIndex } from '@/features/marine/domain/coralPlayback';

describe('nearestYear', () => {
  const years = [2018, 2020, 2022, 2024, 2030];

  it('returns the exact match when target is a known year', () => {
    expect(nearestYear(years, 2022)).toBe(2022);
  });

  it('returns the nearest year when target falls between two entries', () => {
    expect(nearestYear(years, 2021)).toBe(2020);
    expect(nearestYear(years, 2023)).toBe(2022);
  });

  it('breaks ties toward the earlier (lower) year', () => {
    // 2021 is equidistant from 2020 and 2022... use an exact midpoint instead.
    expect(nearestYear([2000, 2010], 2005)).toBe(2000);
  });

  it('clamps to the nearest boundary when target is outside the range', () => {
    expect(nearestYear(years, 1900)).toBe(2018);
    expect(nearestYear(years, 2100)).toBe(2030);
  });

  it('returns null for an empty years array', () => {
    expect(nearestYear([], 2020)).toBeNull();
  });
});

describe('nextYearIndex', () => {
  it('advances to the next index', () => {
    expect(nextYearIndex(0, 5)).toBe(1);
    expect(nextYearIndex(3, 5)).toBe(4);
  });

  it('loops back to 0 after the last index', () => {
    expect(nextYearIndex(4, 5)).toBe(0);
  });

  it('always returns 0 when there is 1 or 0 years', () => {
    expect(nextYearIndex(0, 1)).toBe(0);
    expect(nextYearIndex(0, 0)).toBe(0);
  });
});
