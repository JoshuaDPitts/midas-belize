'use client';
import { useSetAtom } from 'jotai';
import { useCallback } from 'react';
import {
  activeSiteAtom,
  activeScenarioAtom,
  visibleLayersAtom,
  timeStepAtom,
} from '@/atoms';

/**
 * Returns a callback that clears the 4 URL-shareable atoms (site, scenario,
 * visibleLayers, timeStep) back to their defaults. Viewport is left alone —
 * resetting it would be jarring (the map would jump to the default Belize
 * extent in the middle of the user's exploration).
 */
export function useResetToDefaults() {
  const setSite = useSetAtom(activeSiteAtom);
  const setScenario = useSetAtom(activeScenarioAtom);
  const setLayers = useSetAtom(visibleLayersAtom);
  const setStep = useSetAtom(timeStepAtom);

  return useCallback(() => {
    setSite(null);
    setScenario(null);
    setLayers([]);
    setStep(0);
  }, [setSite, setScenario, setLayers, setStep]);
}
