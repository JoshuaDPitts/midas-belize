'use client';
import { useEffect, useRef, useState, type Ref } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  activeSiteAtom,
  selectedPolygonAtom,
  type SelectedPolygonRef,
} from '@/atoms';
import { WatershedHeroCard } from './WatershedHeroCard';
import { ErosionAttributionChart } from './ErosionAttributionChart';
import { RusleFormulaCard } from './RusleFormulaCard';
import { NbSPriorityPanel } from './NbSPriorityPanel';
import { RainfallSeasonality } from './RainfallSeasonality';
import { ScenarioImpactPanel } from './ScenarioImpactPanel';
import { SedimentMassBalance } from './SedimentMassBalance';
import styles from './WatershedDomainContent.module.css';

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefers(mq.matches);
    const listener = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mq.addEventListener?.('change', listener);
    return () => mq.removeEventListener?.('change', listener);
  }, []);
  return prefers;
}

function Tier1Panel() {
  // The NbSPriorityPanel is the WS-024 fill of Tier 1. Wrapped in a div
  // carrying the legacy `watershed-tier-1` testid so REQ-WS-002 scaffold
  // contract holds.
  return (
    <div data-testid="watershed-tier-1" className={`${styles.tier1} ${styles.tier1Slot}`}>
      <NbSPriorityPanel />
    </div>
  );
}

function Tier1Chip({
  selected,
  backRef,
}: {
  selected: SelectedPolygonRef;
  backRef?: Ref<HTMLButtonElement>;
}) {
  const clearSelection = useSetAtom(selectedPolygonAtom);
  const reduced = usePrefersReducedMotion();
  return (
    <div
      data-testid="watershed-tier-1-chip"
      data-reduced-motion={reduced ? 'true' : 'false'}
      className={`${styles.tier1Chip} ${reduced ? styles.noMotion : ''}`}
      role="status"
      aria-live="polite"
    >
      <span className={styles.chipLabel}>
        Showing
        <span className={styles.chipName}>{String(selected.featureId)}</span>
      </span>
      <button
        ref={backRef}
        type="button"
        className={styles.chipBack}
        onClick={() => clearSelection(null)}
        aria-label="Back to ranking"
      >
        <span aria-hidden>←</span>
        <span>Back to ranking</span>
      </button>
    </div>
  );
}

function Tier3({
  selectedFeatureId,
}: {
  selectedFeatureId: string | number | null;
}) {
  return (
    <details data-testid="watershed-tier-3" className={styles.accordion} open>
      <summary className={styles.accordionSummary}>Deep dive</summary>
      <div className={styles.tier3Body}>
        <RainfallSeasonality />
        <ErosionAttributionChart polygonId={selectedFeatureId} />
        <SedimentMassBalance />
        <RusleFormulaCard />
      </div>
    </details>
  );
}

function Tier4Panel() {
  return (
    <details
      data-testid="watershed-tier-4"
      className={styles.accordion}
      id="watershed-scenarios"
    >
      <summary className={styles.accordionSummary}>Scenarios</summary>
      <div className={styles.tier3Body}>
        <ScenarioImpactPanel />
      </div>
    </details>
  );
}

function OffshoreEmptyState() {
  const setActiveSite = useSetAtom(activeSiteAtom);
  return (
    <div data-testid="watershed-empty-offshore" className={styles.emptyState}>
      <div className={styles.emptyHeading}>No watersheds here</div>
      <p className={styles.emptyBody}>
        Laughing Bird Caye is an offshore site with no watersheds. The sediment
        reaching this reef originates upstream in Placencia.
      </p>
      <button
        type="button"
        className={styles.emptyCta}
        aria-label="View upstream context for Placencia"
        onClick={() => setActiveSite('placencia')}
      >
        View upstream context →
      </button>
    </div>
  );
}

export function WatershedDomainContent() {
  const activeSite = useAtomValue(activeSiteAtom);
  const selectedPolygon = useAtomValue(selectedPolygonAtom);
  const chipBackRef = useRef<HTMLButtonElement>(null);
  const previousSelectedRef = useRef<SelectedPolygonRef | null>(selectedPolygon);

  useEffect(() => {
    const previous = previousSelectedRef.current;
    if (!previous && selectedPolygon) {
      chipBackRef.current?.focus();
    }
    if (previous && !selectedPolygon) {
      document
        .querySelector<HTMLButtonElement>('[data-testid="nbs-rank-list"] button')
        ?.focus();
    }
    previousSelectedRef.current = selectedPolygon;
  }, [selectedPolygon]);

  if (activeSite === 'laughing-bird') {
    return (
      <div className={styles.root}>
        <OffshoreEmptyState />
      </div>
    );
  }

  return (
    <div className={styles.root} data-testid="watershed-domain-content">
      {selectedPolygon ? <Tier1Chip selected={selectedPolygon} backRef={chipBackRef} /> : <Tier1Panel />}
      {selectedPolygon && (
        <div data-testid="watershed-tier-2" className={styles.tier2Slot}>
          <WatershedHeroCard />
        </div>
      )}
      <Tier3 selectedFeatureId={selectedPolygon?.featureId ?? null} />
      <Tier4Panel />
    </div>
  );
}
