'use client';
import type { SiteId } from '@/lib/data/types';
import type { ScenarioId } from '../matrix';

export interface VerticalAvailability {
  hasData: boolean;
}

export interface CompareAvailabilityResult {
  coastal: VerticalAvailability;
  watershed: VerticalAvailability;
  marine: VerticalAvailability;
}

/**
 * Checks whether each vertical has compare data for the given scenarios.
 * 
 * For now, returns static availability based on known dataset coverage:
 * - Coastal: Placencia only
 * - Watershed: Placencia only
 * - Marine: No compare data yet (always false)
 * 
 * Future: could fetch from dataset catalog to check dynamically.
 */
export function useCompareAvailability(
  site: SiteId | null,
  scenarioA: ScenarioId | null,
  scenarioB: ScenarioId | null,
): CompareAvailabilityResult {
  // For now, simple static logic based on site
  const hasPlacenciaData = site === 'placencia';

  return {
    coastal: { hasData: hasPlacenciaData },
    watershed: { hasData: hasPlacenciaData },
    marine: { hasData: false }, // No marine compare data yet
  };
}
