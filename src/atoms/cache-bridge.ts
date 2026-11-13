'use client';
import { atom, useSetAtom } from 'jotai';
import { useEffect } from 'react';
import { useLayersForSite, useScenarios } from '@/lib/data';
import type { LayerSummary, ScenarioSummary } from '@/lib/data';
import type { SiteId } from '@/lib/map/core/constants';

/**
 * Internal cache atoms. Populated by useCacheBridgeProvider, read by derived
 * atoms (SM-015). Underscore prefix marks them as bridge internals — consumers
 * should read derived atoms, not these directly.
 */
export const _layerCatalogCacheAtom = atom<LayerSummary[]>([]);
export const _scenariosCacheAtom = atom<ScenarioSummary[]>([]);

export interface CacheBridgeOpts {
  activeSite: SiteId | null;
}

/**
 * Mounts at the same level as <StateProvider>. Calls SWR for the active site's
 * layers and scenarios, then mirrors the results into write-only cache atoms.
 * Derived atoms across the app can then read in pure atom-graph code without
 * needing to reach into React for SWR hooks.
 *
 * Loop avoidance: useLayersForSite / useScenarios return a fresh `[]` array
 * reference on every render while SWR is loading (the `?? []` fallback
 * allocates a new array each call). A naive `useEffect([layers], () => setLayers(layers))`
 * would re-fire forever — the new ref triggers the effect, the effect updates
 * the cache atom, Probe re-renders, the hook returns yet another `[]`, and so
 * on. We guard the setter with a functional update so Jotai bails out via its
 * Object.is comparison whenever incoming and stored arrays would be observably
 * equal (both empty, or same reference).
 */
function arraysEquivalent<T>(a: readonly T[], b: readonly T[]): boolean {
  if (a === b) return true;
  if (a.length === 0 && b.length === 0) return true;
  return false;
}

export function useCacheBridgeProvider({ activeSite }: CacheBridgeOpts) {
  const setLayers = useSetAtom(_layerCatalogCacheAtom);
  const setScenarios = useSetAtom(_scenariosCacheAtom);

  const { layers } = useLayersForSite(activeSite);
  const { scenarios } = useScenarios(activeSite);

  useEffect(() => {
    setLayers((prev) => (arraysEquivalent(prev, layers) ? prev : layers));
  }, [layers, setLayers]);

  useEffect(() => {
    setScenarios((prev) => (arraysEquivalent(prev, scenarios) ? prev : scenarios));
  }, [scenarios, setScenarios]);
}
