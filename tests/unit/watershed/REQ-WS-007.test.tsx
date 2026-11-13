import { describe, it, expect } from 'vitest';
import { aggregateRowsToCladeMap } from '@/features/watershed/map/useWatershedEbinCladePerPolygon';
import { cladeIndexRgba } from '@/features/watershed/map/encoders';

describe('REQ-WS-007: aggregateRowsToCladeMap', () => {
  it('selects dominant clade by area-weighted polygon share', () => {
    const features = [
      { properties: { Name: 'Big Creek', Area_Pct_of_Polygon: 60, Clade_1_pct: 80, Clade_2_pct: 20 } },
      { properties: { Name: 'Big Creek', Area_Pct_of_Polygon: 40, Clade_1_pct: 10, Clade_2_pct: 90 } },
    ];
    const map = aggregateRowsToCladeMap(features);
    const row = map.get('Big Creek');
    // clade 1 weighted: 80*0.6 + 10*0.4 = 52
    // clade 2 weighted: 20*0.6 + 90*0.4 = 48
    expect(row?.dominantClade).toBe(1);
    expect(row?.clades[0]).toBeCloseTo(52, 5);
    expect(row?.clades[1]).toBeCloseTo(48, 5);
  });

  it('breaks ties by lowest clade index', () => {
    const features = [
      { properties: { Name: 'Tie', Area_Pct_of_Polygon: 100, Clade_3_pct: 25, Clade_5_pct: 25 } },
    ];
    const map = aggregateRowsToCladeMap(features);
    expect(map.get('Tie')?.dominantClade).toBe(3);
  });

  it('handles string-typed numeric values', () => {
    const features = [
      { properties: { Name: 'Strings', Area_Pct_of_Polygon: '100', Clade_2_pct: '50', Clade_1_pct: '10' } },
    ];
    const map = aggregateRowsToCladeMap(features);
    expect(map.get('Strings')?.dominantClade).toBe(2);
  });

  it('returns null dominant clade when no Clade_N_pct present', () => {
    const features = [
      { properties: { Name: 'Empty', Area_Pct_of_Polygon: 100 } },
    ];
    const map = aggregateRowsToCladeMap(features);
    expect(map.get('Empty')?.dominantClade).toBeNull();
  });

  it('keys by WATERSHED when Name is absent', () => {
    const features = [
      { properties: { WATERSHED: 'Sennis', Area_Pct_of_Polygon: 100, Clade_1_pct: 100 } },
    ];
    const map = aggregateRowsToCladeMap(features);
    expect(map.get('Sennis')?.dominantClade).toBe(1);
  });

  it('skips features with no polygon key', () => {
    const features = [
      { properties: { Area_Pct_of_Polygon: 100, Clade_1_pct: 50 } },
      { properties: { Name: '', Clade_1_pct: 50 } },
    ];
    const map = aggregateRowsToCladeMap(features);
    expect(map.size).toBe(0);
  });
});

describe('REQ-WS-007: cladeIndexRgba palette', () => {
  it('returns a distinct RGBA for clades 1..N within palette range', () => {
    const c1 = cladeIndexRgba(1);
    const c2 = cladeIndexRgba(2);
    expect(c1).not.toEqual(c2);
    expect(c1[3]).toBe(200);
  });

  it('gives clades past the 8th a distinct color (no modulo collision)', () => {
    // Regression for the old 8-color wrap: clade 9 must not reuse clade 1's color.
    expect(cladeIndexRgba(9)).not.toEqual(cladeIndexRgba(1));
    expect(cladeIndexRgba(13)).not.toEqual(cladeIndexRgba(5));
    const distinct = new Set(
      Array.from({ length: 25 }, (_, i) => cladeIndexRgba(i + 1).join(',')),
    );
    expect(distinct.size).toBe(25);
  });

  it('returns muted gray for indices beyond the 25-clade range', () => {
    expect(cladeIndexRgba(26)).toEqual([120, 120, 120, 180]);
  });

  it('returns muted gray for null index', () => {
    const c = cladeIndexRgba(null);
    expect(c[0]).toBe(120);
    expect(c[1]).toBe(120);
    expect(c[2]).toBe(120);
  });
});
