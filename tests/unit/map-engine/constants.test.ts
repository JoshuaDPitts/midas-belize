// tests/unit/map-engine/constants.test.ts
import { describe, it, expect } from 'vitest';
import {
  BELIZE_BOUNDS,
  BELIZE_CENTER,
  SITE_BOUNDS,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  type SiteId,
} from '@/lib/map/core/constants';

describe('map constants', () => {
  it('Belize bounds are a valid [W,S,E,N] box in EPSG:4326', () => {
    const [w, s, e, n] = BELIZE_BOUNDS;
    expect(w).toBeLessThan(e);
    expect(s).toBeLessThan(n);
    expect(w).toBeGreaterThan(-90);
    expect(e).toBeLessThan(-87);
    expect(s).toBeGreaterThan(15);
    expect(n).toBeLessThan(19);
  });

  it('BELIZE_CENTER lies inside BELIZE_BOUNDS', () => {
    const [w, s, e, n] = BELIZE_BOUNDS;
    const [lng, lat] = BELIZE_CENTER;
    expect(lng).toBeGreaterThan(w);
    expect(lng).toBeLessThan(e);
    expect(lat).toBeGreaterThan(s);
    expect(lat).toBeLessThan(n);
  });

  it('each study site has valid bounds', () => {
    const ids: SiteId[] = ['laughing-bird', 'placencia', 'caye-caulker'];
    for (const id of ids) {
      const [w, s, e, n] = SITE_BOUNDS[id];
      expect(w).toBeLessThan(e);
      expect(s).toBeLessThan(n);
    }
  });

  it('zoom range is sensible', () => {
    expect(MIN_ZOOM).toBeGreaterThanOrEqual(0);
    expect(MIN_ZOOM).toBeLessThan(DEFAULT_ZOOM);
    expect(DEFAULT_ZOOM).toBeLessThan(MAX_ZOOM);
    expect(MAX_ZOOM).toBeLessThanOrEqual(22);
  });
});
