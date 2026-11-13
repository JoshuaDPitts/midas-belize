import { describe, it, expect } from 'vitest';
import { computeRanking } from '@/features/watershed/domain/nbs-ranking/computeRanking';
import type {
  NbsRankFactor,
  WatershedPolygonContext,
} from '@/features/watershed/domain/nbs-ranking/_types';
import type { Feature, Polygon } from 'geojson';

function makePolygon(name: string, props: Record<string, unknown> = {}): WatershedPolygonContext {
  const feature: Feature<Polygon> = {
    type: 'Feature',
    properties: { Name: name, ...props },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    },
  };
  return { feature, properties: feature.properties as Record<string, unknown> };
}

function nbsScoreFactor(): NbsRankFactor<WatershedPolygonContext> {
  return {
    id: 'nbs',
    label: 'NbS Score',
    description: 'higher = better',
    defaultWeight: 1,
    direction: 'higher-better',
    compute: (p) => (typeof p.properties.NbS_Score === 'number' ? p.properties.NbS_Score : null),
  };
}

function erosionRiskFactor(): NbsRankFactor<WatershedPolygonContext> {
  return {
    id: 'erosion',
    label: 'Erosion',
    description: 'lower = better priority',
    defaultWeight: 1,
    direction: 'lower-better',
    compute: (p) => (typeof p.properties.erosion === 'number' ? p.properties.erosion : null),
  };
}

describe('REQ-WS-018: computeRanking', () => {
  it('sorts polygons by composite score descending with single factor', () => {
    const polys = [
      makePolygon('A', { NbS_Score: 0.2 }),
      makePolygon('B', { NbS_Score: 0.8 }),
      makePolygon('C', { NbS_Score: 0.5 }),
    ];
    const ranked = computeRanking(polys, [nbsScoreFactor()], { nbs: 1 });
    expect(ranked.map((r) => (r.polygon.properties as { Name: string }).Name)).toEqual(['B', 'C', 'A']);
  });

  it('respects per-factor weights when blending two factors', () => {
    const polys = [
      makePolygon('A', { NbS_Score: 0.9, erosion: 1000 }), // high NbS, high erosion (bad)
      makePolygon('B', { NbS_Score: 0.1, erosion: 0 }),    // low NbS, low erosion (good)
    ];
    // With weight 100x on erosion, B wins because its erosion z is far better.
    const ranked = computeRanking(
      polys,
      [nbsScoreFactor(), erosionRiskFactor()],
      { nbs: 0.01, erosion: 100 },
    );
    expect((ranked[0].polygon.properties as { Name: string }).Name).toBe('B');
  });

  it('lower-better direction inverts the raw values before z-scoring', () => {
    const polys = [
      makePolygon('A', { erosion: 100 }),
      makePolygon('B', { erosion: 10 }),
      makePolygon('C', { erosion: 1 }),
    ];
    const ranked = computeRanking(polys, [erosionRiskFactor()], { erosion: 1 });
    // C has the lowest erosion → highest score under lower-better.
    expect(ranked.map((r) => (r.polygon.properties as { Name: string }).Name)).toEqual(['C', 'B', 'A']);
  });

  it('handles stdev=0 (all polygons share the same value)', () => {
    const polys = [
      makePolygon('A', { NbS_Score: 0.5 }),
      makePolygon('B', { NbS_Score: 0.5 }),
    ];
    const ranked = computeRanking(polys, [nbsScoreFactor()], { nbs: 1 });
    // Both score 0 (z=0 because stdev fallback); order is stable on input.
    expect(ranked.every((r) => r.score === 0)).toBe(true);
    expect(ranked.map((r) => (r.polygon.properties as { Name: string }).Name)).toEqual(['A', 'B']);
  });

  it('excludes null cells from the polygon-factor blend (other factors still rank)', () => {
    const polys = [
      makePolygon('A', { NbS_Score: 0.8 }), // erosion missing
      makePolygon('B', { NbS_Score: 0.2, erosion: 10 }),
      makePolygon('C', { NbS_Score: 0.5, erosion: 100 }),
    ];
    const ranked = computeRanking(
      polys,
      [nbsScoreFactor(), erosionRiskFactor()],
      { nbs: 1, erosion: 1 },
    );
    // A scores only on NbS (highest); the null erosion cell contributes 0.
    const aRow = ranked.find((r) => (r.polygon.properties as { Name: string }).Name === 'A')!;
    const aErosion = aRow.perFactor.find((p) => p.factorId === 'erosion')!;
    expect(aErosion.rawValue).toBeNull();
    expect(aErosion.weightedZ).toBe(0);
  });

  it('perFactor.rawValue displays the un-inverted metric for lower-better factors', () => {
    const polys = [
      makePolygon('A', { erosion: 100 }),
      makePolygon('B', { erosion: 1 }),
    ];
    const ranked = computeRanking(polys, [erosionRiskFactor()], { erosion: 1 });
    // rawValue should show the actual erosion value (100, 1), not -100 / -1.
    for (const row of ranked) {
      const cell = row.perFactor.find((c) => c.factorId === 'erosion')!;
      expect(cell.rawValue).toBeGreaterThan(0);
    }
  });

  it('returns empty array when there are no polygons', () => {
    expect(computeRanking([], [nbsScoreFactor()], {})).toEqual([]);
  });

  it('returns identical scores 0 when there are no factors', () => {
    const polys = [makePolygon('A'), makePolygon('B')];
    const ranked = computeRanking(polys, [], {});
    expect(ranked.every((r) => r.score === 0)).toBe(true);
    expect(ranked).toHaveLength(2);
  });

  it('weight override beats defaultWeight', () => {
    const factor = { ...nbsScoreFactor(), defaultWeight: 0 };
    const polys = [
      makePolygon('A', { NbS_Score: 0.1 }),
      makePolygon('B', { NbS_Score: 0.9 }),
    ];
    const ranked = computeRanking(polys, [factor], { nbs: 1 });
    expect(ranked[0].score).not.toBe(0);
  });
});
