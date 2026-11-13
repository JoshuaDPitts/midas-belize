import { describe, it, expect } from 'vitest';
import { aggregateRows } from '@/features/marine/map/useEbinCladePerPolygon';

const feat = (props: Record<string, unknown>) => ({ properties: props });

describe('aggregateRows', () => {
  it('returns empty map for empty input', () => {
    expect(aggregateRows([]).size).toBe(0);
  });

  it('produces one entry per polygon key across multiple BIN rows', () => {
    const out = aggregateRows([
      feat({ MIMES_ID: 1, BIN_ID: 1, Area_Pct_of_Polygon: 50, Clade_1_pct: 100 }),
      feat({ MIMES_ID: 1, BIN_ID: 2, Area_Pct_of_Polygon: 50, Clade_2_pct: 100 }),
      feat({ MIMES_ID: 2, BIN_ID: 1, Area_Pct_of_Polygon: 100, Clade_3_pct: 50 }),
    ]);
    expect(out.size).toBe(2);
    expect(out.get('1')?.polygonKey).toBe(1);
    expect(out.get('2')?.polygonKey).toBe(2);
  });

  it('weights Clade_N_pct by Area_Pct_of_Polygon (area-weighted sum)', () => {
    const out = aggregateRows([
      feat({ MIMES_ID: 1, Area_Pct_of_Polygon: 25, Clade_1_pct: 80 }),
      feat({ MIMES_ID: 1, Area_Pct_of_Polygon: 75, Clade_2_pct: 60 }),
    ]);
    const agg = out.get('1')!;
    // clade 1: 80 * (25/100) = 20
    // clade 2: 60 * (75/100) = 45
    expect(agg.clades[0]).toBeCloseTo(20, 6);
    expect(agg.clades[1]).toBeCloseTo(45, 6);
    expect(agg.dominantClade).toBe(2);
  });

  it('coerces string-typed numeric values (live data still has strings)', () => {
    const out = aggregateRows([
      feat({ MIMES_ID: '5', Area_Pct_of_Polygon: '100', Clade_3_pct: '0.42', Clade_4_pct: '0.10' }),
    ]);
    expect(out.size).toBe(1);
    const agg = out.get('5')!;
    expect(agg.clades[2]).toBeCloseTo(0.42, 6);
    expect(agg.clades[3]).toBeCloseTo(0.10, 6);
    expect(agg.dominantClade).toBe(3);
  });

  it('normalises trailing-decimal keys ("33.0" matches "33")', () => {
    const out = aggregateRows([
      feat({ MIMES_ID: '33.0', Clade_1_pct: 10 }),
      feat({ MIMES_ID: 33, Clade_1_pct: 20 }),
    ]);
    expect(out.size).toBe(1);
    expect(out.get('33')?.clades[0]).toBeCloseTo(30, 6);
  });

  it('falls back through MIMES_ID → Polygon_ID → id → ID for the polygon key', () => {
    const out = aggregateRows([
      feat({ Polygon_ID: 7, Clade_1_pct: 5 }),
      feat({ id: 8, Clade_1_pct: 5 }),
      feat({ ID: 9, Clade_1_pct: 5 }),
    ]);
    expect(Array.from(out.keys()).sort()).toEqual(['7', '8', '9']);
  });

  it('returns dominantClade=null when no clade values are present', () => {
    const out = aggregateRows([
      feat({ MIMES_ID: 1, BIN_ID: 1, Area_Pct_of_Polygon: 100 }),
    ]);
    expect(out.get('1')?.dominantClade).toBeNull();
  });

  it('skips features with no usable polygon key', () => {
    const out = aggregateRows([
      feat({ Clade_1_pct: 50 }),
      feat({ MIMES_ID: null, Clade_1_pct: 50 }),
      feat({ MIMES_ID: '', Clade_1_pct: 50 }),
    ]);
    expect(out.size).toBe(0);
  });

  it('defaults to full-polygon weight when Area_Pct_of_Polygon is absent', () => {
    const out = aggregateRows([
      feat({ MIMES_ID: 1, Clade_5_pct: 12 }),
    ]);
    expect(out.get('1')?.clades[4]).toBeCloseTo(12, 6);
    expect(out.get('1')?.dominantClade).toBe(5);
  });
});
