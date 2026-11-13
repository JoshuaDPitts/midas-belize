// tests/unit/map-engine/REQ-ME-008.test.ts
// ME-008 — spatial queries + draw mode state machine.
import { describe, it, expect } from 'vitest';
import {
  reduce,
  initialState,
  type DrawState,
} from '@/lib/map/interaction/drawStateMachine';
import {
  queryAt,
  queryInBbox,
  numericStats,
  sampleLine,
  haversineKm,
  queryAlongLine,
} from '@/lib/map/interaction/queries';
import type { FeatureHit } from '@/atoms';

describe('REQ-ME-008: draw state machine', () => {
  it('starts in none/no-shape', () => {
    expect(initialState).toEqual({ mode: 'none', shape: null });
  });

  it('setMode enters the requested mode with no shape', () => {
    const out = reduce(initialState, { type: 'setMode', mode: 'area' });
    expect(out.state.mode).toBe('area');
    expect(out.state.shape).toBeNull();
    expect(out.commit).toBeNull();
  });

  it('point: single click commits and returns to none', () => {
    let s: DrawState = { mode: 'point', shape: null };
    const out = reduce(s, { type: 'click', lngLat: [-88, 17] });
    expect(out.commit).toEqual({ mode: 'point', points: [[-88, 17]] });
    expect(out.state.mode).toBe('none');
  });

  it('area: click accumulates vertices without committing', () => {
    let s: DrawState = { mode: 'area', shape: null };
    s = reduce(s, { type: 'click', lngLat: [-88, 17] }).state;
    s = reduce(s, { type: 'click', lngLat: [-87, 17] }).state;
    const out = reduce(s, { type: 'click', lngLat: [-87, 18] });
    expect(out.commit).toBeNull();
    expect(out.state.shape?.points).toHaveLength(3);
  });

  it('area: dblclick with 3+ vertices commits and clears', () => {
    let s: DrawState = { mode: 'area', shape: null };
    s = reduce(s, { type: 'click', lngLat: [-88, 17] }).state;
    s = reduce(s, { type: 'click', lngLat: [-87, 17] }).state;
    s = reduce(s, { type: 'click', lngLat: [-87, 18] }).state;
    const out = reduce(s, { type: 'doubleClick' });
    expect(out.commit?.points).toHaveLength(3);
    expect(out.state.mode).toBe('none');
  });

  it('area: dblclick with < 3 vertices is a no-op', () => {
    let s: DrawState = { mode: 'area', shape: null };
    s = reduce(s, { type: 'click', lngLat: [-88, 17] }).state;
    s = reduce(s, { type: 'click', lngLat: [-87, 17] }).state;
    const out = reduce(s, { type: 'doubleClick' });
    expect(out.commit).toBeNull();
    expect(out.state.mode).toBe('area'); // still drawing
  });

  it('transect: two clicks commit the line', () => {
    let s: DrawState = { mode: 'transect', shape: null };
    s = reduce(s, { type: 'click', lngLat: [-88.7, 17.0] }).state;
    expect(s.shape?.points).toHaveLength(1);
    const out = reduce(s, { type: 'click', lngLat: [-87.9, 17.8] });
    expect(out.commit?.points).toHaveLength(2);
    expect(out.state.mode).toBe('none');
  });

  it('escape clears in-flight state from any mode', () => {
    let s: DrawState = { mode: 'area', shape: { mode: 'area', points: [[-88, 17]] } };
    const out = reduce(s, { type: 'escape' });
    expect(out.state).toEqual(initialState);
  });

  it('setMode while drawing cancels the in-flight shape', () => {
    let s: DrawState = { mode: 'area', shape: { mode: 'area', points: [[-88, 17], [-87, 17]] } };
    const out = reduce(s, { type: 'setMode', mode: 'point' });
    expect(out.state.mode).toBe('point');
    expect(out.state.shape).toBeNull();
  });
});

describe('REQ-ME-008: queryAt z-order', () => {
  const mkHit = (layerId: string, featureId: string): FeatureHit => ({
    layerId,
    featureId,
    properties: {},
    lngLat: [0, 0],
  });

  it('returns hits top-to-bottom by layer order (last layer = top)', () => {
    const hits = [mkHit('a', '1'), mkHit('b', '2'), mkHit('c', '3')];
    const sorted = queryAt(hits, ['a', 'b', 'c']);
    expect(sorted.map((h) => h.layerId)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input array', () => {
    const hits = [mkHit('a', '1'), mkHit('b', '2')];
    const snap = hits.slice();
    queryAt(hits, ['a', 'b']);
    expect(hits).toEqual(snap);
  });
});

describe('REQ-ME-008: queryInBbox + numericStats', () => {
  it('numericStats reports count / sum / mean / min / max / stddev', () => {
    const props = [{ v: 2 }, { v: 4 }, { v: 4 }, { v: 4 }, { v: 5 }, { v: 5 }, { v: 7 }, { v: 9 }];
    const out = numericStats(props);
    expect(out.v.count).toBe(8);
    expect(out.v.sum).toBe(40);
    expect(out.v.mean).toBe(5);
    expect(out.v.min).toBe(2);
    expect(out.v.max).toBe(9);
    expect(out.v.stddev).toBeCloseTo(2, 5);
  });

  it('numericStats ignores non-numeric attributes', () => {
    const props = [{ name: 'x', v: 1 }, { name: 'y', v: 3 }];
    const out = numericStats(props);
    expect(Object.keys(out)).toEqual(['v']);
  });

  it('queryInBbox groups by layer and computes stats per group', () => {
    const hits: FeatureHit[] = [
      { layerId: 'a', featureId: 'a1', properties: { v: 1 }, lngLat: [0, 0] },
      { layerId: 'a', featureId: 'a2', properties: { v: 3 }, lngLat: [0, 0] },
      { layerId: 'b', featureId: 'b1', properties: { w: 10 }, lngLat: [0, 0] },
    ];
    const summaries = queryInBbox(hits);
    const byId = new Map(summaries.map((s) => [s.layerId, s]));
    expect(byId.get('a')!.count).toBe(2);
    expect(byId.get('a')!.numeric.v.mean).toBe(2);
    expect(byId.get('b')!.numeric.w.mean).toBe(10);
  });

  it('queryInBbox returns empty when hits is empty', () => {
    expect(queryInBbox([])).toEqual([]);
  });
});

describe('REQ-ME-008: transect math', () => {
  it('haversineKm Belize spans (~80 km)', () => {
    // Laughing Bird Caye to Caye Caulker, roughly 80 km
    const km = haversineKm([-88.197, 16.442], [-88.030, 17.740]);
    expect(km).toBeGreaterThan(140);
    expect(km).toBeLessThan(150); // ~ 144.6 km
  });

  it('sampleLine produces ≥ 100 samples when requested', () => {
    const pts = sampleLine([-88.7, 17], [-87.9, 17], 100);
    expect(pts.length).toBe(100);
    expect(pts[0].distance).toBe(0);
    expect(pts[99].distance).toBeGreaterThan(pts[0].distance);
  });

  it('queryAlongLine walks samples via lookup and preserves ordering', () => {
    const lookup = (pt: [number, number]) => {
      // Fake: layer A returns a value proportional to pt[0] offset.
      return { a: { v: (pt[0] + 90) * 10 } };
    };
    const profile = queryAlongLine([-88, 17], [-87, 17], 100, lookup);
    expect(profile.samples.length).toBe(100);
    const first = profile.samples[0].values.a.v as number;
    const last = profile.samples[99].values.a.v as number;
    expect(last).toBeGreaterThan(first);
  });
});
