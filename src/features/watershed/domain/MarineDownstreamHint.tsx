'use client';
import { useSetAtom } from 'jotai';
import {
  activeFeatureAtom,
  activeSiteAtom,
  selectedPolygonAtom,
} from '@/atoms';
import type { MarineImpactSummary } from '@/lib/data/hooks/useScenarioImpact';
import styles from './MarineDownstreamHint.module.css';

export interface MarineDownstreamHintProps {
  marineImpact: MarineImpactSummary | null;
}

/** Footer pill that renders only when useScenarioImpact returns non-null
 * marineImpact. WS-044 three-hop bridge: clicking dispatches the full
 * cross-vertical jump — switches the active vertical to Marine, navigates
 * to Laughing Bird Caye (where the downstream reef impact lives), and
 * clears any polygon selection so Marine opens at the site-aggregate view. */
export function MarineDownstreamHint({ marineImpact }: MarineDownstreamHintProps) {
  const setActiveFeature = useSetAtom(activeFeatureAtom);
  const setActiveSite = useSetAtom(activeSiteAtom);
  const setSelectedPolygon = useSetAtom(selectedPolygonAtom);
  if (!marineImpact) return null;
  const pct = Math.round(marineImpact.sediment_stressed_pct);
  const arrow = pct < 0 ? '↓' : pct > 0 ? '↑' : '→';
  return (
    <button
      type="button"
      data-testid="marine-downstream-hint"
      className={styles.pill}
      onClick={() => {
        setSelectedPolygon(null);
        setActiveSite('laughing-bird');
        setActiveFeature('marine');
      }}
      aria-label="Jump to Marine vertical at Laughing Bird Caye to see scenario impact"
    >
      <span aria-hidden className={styles.icon}>🌊</span>
      <span>
        {arrow} {Math.abs(pct)}% sediment-stressed reef area
      </span>
      {marineImpact.lbc_attribution !== null && (
        <span className={styles.attribution}>
          · {Math.round(marineImpact.lbc_attribution * 100)}% Laughing Bird attribution
        </span>
      )}
    </button>
  );
}
