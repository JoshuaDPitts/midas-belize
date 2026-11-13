import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import {
  activeSiteAtom,
  visibleLayersAtom,
  timeStepAtom,
  timeRangeAtom,
  layersForActiveSiteAtom,
  visibleLayerObjectsAtom,
  activeSiteScenariosAtom,
  currentTimeISOAtom,
} from '@/atoms';
import {
  _layerCatalogCacheAtom,
  _scenariosCacheAtom,
} from '@/atoms/cache-bridge';

describe('REQ-SM-015 — derived atoms', () => {
  it('layersForActiveSiteAtom returns all cache rows when site is set', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(_layerCatalogCacheAtom, [
      { id: 'a', family: 'marine' } as never,
      { id: 'b', family: 'erosion' } as never,
    ]);
    expect(store.get(layersForActiveSiteAtom)).toHaveLength(2);
  });

  it('layersForActiveSiteAtom is empty when no site', () => {
    const store = createStore();
    store.set(activeSiteAtom, null);
    expect(store.get(layersForActiveSiteAtom)).toEqual([]);
  });

  it('visibleLayerObjectsAtom returns LayerSummaries in z-order', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(_layerCatalogCacheAtom, [
      { id: 'a' } as never,
      { id: 'b' } as never,
      { id: 'c' } as never,
    ]);
    store.set(visibleLayersAtom, ['c', 'a']);
    const objs = store.get(visibleLayerObjectsAtom);
    expect(objs.map((l) => l.id)).toEqual(['c', 'a']);
  });

  it('visibleLayerObjectsAtom drops ids missing from the cache', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(_layerCatalogCacheAtom, [{ id: 'a' } as never]);
    store.set(visibleLayersAtom, ['a', 'missing']);
    expect(store.get(visibleLayerObjectsAtom).map((l) => l.id)).toEqual(['a']);
  });

  it('activeSiteScenariosAtom mirrors the cache when a site is active', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(_scenariosCacheAtom, [{ id: 's1' } as never, { id: 's2' } as never]);
    expect(store.get(activeSiteScenariosAtom)).toHaveLength(2);
  });

  it('currentTimeISOAtom returns the active step ISO date', () => {
    const store = createStore();
    store.set(timeRangeAtom, ['2024-01-01', '2024-02-01', '2024-03-01']);
    store.set(timeStepAtom, 1);
    expect(store.get(currentTimeISOAtom)).toBe('2024-02-01');
  });

  it('currentTimeISOAtom returns null when step is out of range', () => {
    const store = createStore();
    store.set(timeRangeAtom, ['2024-01-01']);
    store.set(timeStepAtom, 99);
    expect(store.get(currentTimeISOAtom)).toBeNull();
  });
});
