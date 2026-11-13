// tests/unit/map-engine/REQ-ME-011.test.ts
// ME-011 — site bounds + fly-to. Covers the pure padding helper, the
// constants shape expected by the spec, and flyTo duration bounds.
import { describe, it, expect } from 'vitest';
import {
  computePadding,
  shouldFitSite,
  DEFAULT_PADDING_RATIO,
  FLY_TO_DURATION_MS,
  FIT_DURATION_MS,
} from '@/lib/map/core/useSiteNavigation';
import {
  BELIZE_BOUNDS,
  SITE_BOUNDS,
  MIN_ZOOM,
  MAX_ZOOM,
  type SiteId,
} from '@/lib/map/core/constants';

describe('REQ-ME-011: computePadding', () => {
  it('returns 10% of each dimension at the default ratio', () => {
    const p = computePadding({ width: 1000, height: 500 });
    expect(p).toEqual({ top: 50, bottom: 50, left: 100, right: 100 });
  });

  it('respects an explicit ratio override', () => {
    const p = computePadding({ width: 1000, height: 500 }, 0.05);
    expect(p).toEqual({ top: 25, bottom: 25, left: 50, right: 50 });
  });

  it('default ratio is 10%', () => {
    expect(DEFAULT_PADDING_RATIO).toBe(0.1);
  });

  it('handles zero-size gracefully (no NaN)', () => {
    const p = computePadding({ width: 0, height: 0 });
    expect(p).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});

describe('REQ-ME-011: animation timing defaults', () => {
  it('fly-to duration is ≤ 1500ms (spec: "completing within 1.5 seconds")', () => {
    expect(FLY_TO_DURATION_MS).toBeLessThanOrEqual(1500);
    expect(FLY_TO_DURATION_MS).toBeGreaterThan(0);
  });

  it('fit-to-bounds duration is shorter than fly-to', () => {
    expect(FIT_DURATION_MS).toBeLessThan(FLY_TO_DURATION_MS);
  });
});

describe('REQ-ME-011: Belize + site bounds constants', () => {
  it('BELIZE_BOUNDS is a valid [W, S, E, N] tuple', () => {
    expect(BELIZE_BOUNDS).toHaveLength(4);
    const [w, s, e, n] = BELIZE_BOUNDS;
    expect(e).toBeGreaterThan(w);
    expect(n).toBeGreaterThan(s);
    expect(w).toBeGreaterThanOrEqual(-180);
    expect(e).toBeLessThanOrEqual(180);
    expect(s).toBeGreaterThanOrEqual(-90);
    expect(n).toBeLessThanOrEqual(90);
  });

  it('defines bounds for all three study sites', () => {
    const expected: SiteId[] = ['laughing-bird', 'placencia', 'caye-caulker'];
    for (const id of expected) {
      const bbox = SITE_BOUNDS[id];
      expect(bbox).toBeDefined();
      const [w, s, e, n] = bbox;
      expect(e).toBeGreaterThan(w);
      expect(n).toBeGreaterThan(s);
    }
  });

  it('each site bbox lies inside BELIZE_BOUNDS', () => {
    const [bw, bs, be, bn] = BELIZE_BOUNDS;
    for (const id of Object.keys(SITE_BOUNDS) as SiteId[]) {
      const [sw, ss, se, sn] = SITE_BOUNDS[id];
      expect(sw).toBeGreaterThanOrEqual(bw);
      expect(ss).toBeGreaterThanOrEqual(bs);
      expect(se).toBeLessThanOrEqual(be);
      expect(sn).toBeLessThanOrEqual(bn);
    }
  });
});

describe('REQ-ME-011: zoom clamps', () => {
  it('MIN_ZOOM covers Belize-level overview', () => {
    // Belize bbox spans ~2° lng × ~2.7° lat. A minZoom of 5 fits it easily.
    expect(MIN_ZOOM).toBeLessThanOrEqual(6);
  });

  it('MAX_ZOOM is ≤ 22 per spec', () => {
    expect(MAX_ZOOM).toBeLessThanOrEqual(22);
  });
});

describe('BUG A: shouldFitSite — activeSite → camera auto-fit decision', () => {
  it('fits when last-fit is null and a site becomes active while ready', () => {
    const bbox = shouldFitSite(null, 'laughing-bird', true);
    expect(bbox).toEqual(SITE_BOUNDS['laughing-bird']);
  });

  it('is a no-op when the same site is already the last-fit site', () => {
    expect(shouldFitSite('laughing-bird', 'laughing-bird', true)).toBeNull();
  });

  it('fits again when switching from one site to a different site', () => {
    const bbox = shouldFitSite('laughing-bird', 'placencia', true);
    expect(bbox).toEqual(SITE_BOUNDS['placencia']);
  });

  it('is a no-op when the map is not ready yet, even for a new site', () => {
    expect(shouldFitSite(null, 'caye-caulker', false)).toBeNull();
  });

  it('is a no-op when there is no active site', () => {
    expect(shouldFitSite('laughing-bird', null, true)).toBeNull();
  });

  it('fits for all three study sites independently', () => {
    const sites: SiteId[] = ['laughing-bird', 'placencia', 'caye-caulker'];
    for (const id of sites) {
      expect(shouldFitSite(null, id, true)).toEqual(SITE_BOUNDS[id]);
    }
  });
});
