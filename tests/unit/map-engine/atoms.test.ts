// tests/unit/map-engine/atoms.test.ts
import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import {
  mapViewportAtom,
  inspectedFeatureAtom,
  selectionAtom,
  basemapAtom,
  timeStepAtom,
  playingAtom,
  playbackSpeedAtom,
  timeRangeAtom,
  type MapViewport,
} from '@/atoms';
import { BELIZE_CENTER, DEFAULT_ZOOM } from '@/lib/map/core/constants';

describe('map atoms', () => {
  it('viewport defaults to Belize', () => {
    const s = createStore();
    const v = s.get(mapViewportAtom);
    expect(v.center).toEqual(BELIZE_CENTER);
    expect(v.zoom).toBe(DEFAULT_ZOOM);
    expect(v.bearing).toBe(0);
    expect(v.pitch).toBe(0);
  });

  it('viewport is writable', () => {
    const s = createStore();
    const v: MapViewport = { center: [-88.37, 16.52], zoom: 12, bearing: 30, pitch: 45 };
    s.set(mapViewportAtom, v);
    expect(s.get(mapViewportAtom)).toEqual(v);
  });

  it('inspectedFeatureAtom defaults to null', () => {
    expect(createStore().get(inspectedFeatureAtom)).toBeNull();
  });

  it('selection defaults to empty set', () => {
    expect(createStore().get(selectionAtom).size).toBe(0);
  });

  it('basemap defaults to light', () => {
    expect(createStore().get(basemapAtom)).toBe('light');
  });
});

describe('time atoms', () => {
  it('playback defaults are sane', () => {
    const s = createStore();
    expect(s.get(playingAtom)).toBe(false);
    expect(s.get(playbackSpeedAtom)).toBe(1);
    expect(s.get(timeStepAtom)).toBe(0);
    const r = s.get(timeRangeAtom);
    expect(r.length).toBeGreaterThan(0);
  });
});
