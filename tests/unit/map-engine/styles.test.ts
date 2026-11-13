// tests/unit/map-engine/styles.test.ts
import { describe, it, expect } from 'vitest';
import { BASEMAPS, type BasemapId } from '@/lib/map/core/styles';

describe('basemap styles', () => {
  it('exports exactly four basemaps', () => {
    const ids = Object.keys(BASEMAPS) as BasemapId[];
    expect(ids.sort()).toEqual(['dark', 'light', 'satellite', 'terrain']);
  });

  it('each basemap has a label, style spec or URL, and attribution', () => {
    for (const id of Object.keys(BASEMAPS) as BasemapId[]) {
      const bm = BASEMAPS[id];
      expect(bm.label).toBeTruthy();
      expect(bm.style).toBeTruthy();
      expect(bm.attribution).toBeTruthy();
    }
  });

  it('raster basemaps include a source and a raster layer', () => {
    // All four basemaps are now raster style objects. Light/Dark moved from
    // OpenFreeMap vector URLs to Esri Gray Canvas rasters because the vector
    // styles render blank over open ocean at reef zoom (empty offshore tiles).
    for (const id of ['light', 'dark', 'satellite', 'terrain'] as const) {
      const style = BASEMAPS[id].style;
      expect(typeof style).toBe('object');
      if (typeof style !== 'object') throw new Error('expected style spec');
      const sources = Object.values(style.sources);
      expect(sources.some((s) => s.type === 'raster')).toBe(true);
      expect(style.layers.some((l) => l.type === 'raster')).toBe(true);
    }
  });

  function tileUrlsFor(id: BasemapId): string {
    const style = BASEMAPS[id].style;
    if (typeof style !== 'object') throw new Error('expected style spec');
    return Object.values(style.sources)
      .flatMap((s) => ('tiles' in s && s.tiles ? s.tiles : []))
      .join(' ');
  }

  it('dark uses Esri Dark Gray Canvas base + reference layers', () => {
    const urls = tileUrlsFor('dark');
    expect(urls).toContain('Canvas/World_Dark_Gray_Base');
    expect(urls).toContain('Canvas/World_Dark_Gray_Reference');
  });

  it('light uses Esri Ocean base (blue water for the reef app)', () => {
    const urls = tileUrlsFor('light');
    expect(urls).toContain('Ocean/World_Ocean_Base');
  });

  it('light Ocean source is capped at its real-data zoom (avoids placeholder tiles)', () => {
    const style = BASEMAPS.light.style;
    if (typeof style !== 'object') throw new Error('expected style spec');
    const maxzooms = Object.values(style.sources).map((s) =>
      'maxzoom' in s ? s.maxzoom : undefined,
    );
    // Real Ocean bathymetry ends at z10 here; z11+ is a "Map data not yet
    // available" placeholder, so the source must overzoom from <=10.
    expect(maxzooms.every((z) => typeof z === 'number' && z <= 10)).toBe(true);
  });
});
