'use client';
import { Provider, createStore } from 'jotai';
import { useState, type ReactNode } from 'react';
import {
  activeSiteAtom,
  activeScenarioAtom,
  timeStepAtom,
  visibleLayersAtom,
  mapViewportAtom,
  type MapViewport,
} from '@/atoms';
import type { SiteId } from '@/lib/map/core/constants';
import type { ScenarioId } from '@/features/scenarios/matrix';

export interface StateInitialValues {
  site?: SiteId | null;
  scenario?: ScenarioId | null;
  timeStep?: number;
  visibleLayers?: string[];
  viewport?: MapViewport;
}

export interface StateProviderProps {
  initialValues: StateInitialValues;
  children: ReactNode;
}

export function StateProvider({ initialValues, children }: StateProviderProps) {
  // Build the store once per mount — reseeding on prop changes would erase
  // user state. URL-driven re-hydration after navigation is handled by the
  // url-sync layer (SM-009..013), not by remounting the provider.
  const [store] = useState(() => {
    const s = createStore();
    if (initialValues.site !== undefined) s.set(activeSiteAtom, initialValues.site);
    if (initialValues.scenario !== undefined)
      s.set(activeScenarioAtom, initialValues.scenario);
    if (initialValues.timeStep !== undefined)
      s.set(timeStepAtom, initialValues.timeStep);
    if (initialValues.visibleLayers !== undefined)
      s.set(visibleLayersAtom, initialValues.visibleLayers);
    if (initialValues.viewport !== undefined)
      s.set(mapViewportAtom, initialValues.viewport);
    return s;
  });
  return <Provider store={store}>{children}</Provider>;
}
