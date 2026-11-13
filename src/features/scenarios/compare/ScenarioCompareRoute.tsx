'use client';
import { useAtomValue } from 'jotai';
import {
  activeSiteAtom,
  activeScenarioAtom,
  compareScenarioBAtom,
  compareVerticalAtom,
  compareLayoutModeAtom,
} from '@/atoms';
import { useCompareUrlSyncProvider } from '@/atoms/url-sync';
import { CompareToolbar } from './CompareToolbar';
import { CompareLayoutDiffOverlay } from './CompareLayoutDiffOverlay';
import { CompareLayoutSwipe } from './CompareLayoutSwipe';
import styles from './ScenarioCompareRoute.module.css';

/**
 * REQ-SC-025: ScenarioCompareRoute
 * 
 * Orchestrates the scenario comparison UI:
 * - Syncs compare state with URL params via useCompareUrlSyncProvider
 * - Renders toolbar with scenario/vertical/mode controls
 * - Conditionally renders Diff or Swipe layout based on mode
 * - Handles empty state when scenarios not selected
 * 
 * Design: Scenario A comes from activeScenarioAtom, Scenario B from compareScenarioBAtom.
 * Only B is synced to URL (?b=), allowing A to serve as the stable baseline.
 */
export function ScenarioCompareRoute() {
  // URL sync (bidirectional) for compare-specific atoms
  useCompareUrlSyncProvider();

  // Read current state. Scenario A (the baseline) falls back to 'basecase' when
  // activeScenarioAtom is null — that atom is not persisted and has no ?a= URL
  // sync, so on a direct /compare load (shared link / refresh) it would otherwise
  // be null and strand the route in the empty state. Comparing basecase-vs-B is
  // the primary flow; honoring an explicit ?a= is a documented follow-up.
  const site = useAtomValue(activeSiteAtom);
  const scenarioA = useAtomValue(activeScenarioAtom) ?? 'basecase';
  const scenarioB = useAtomValue(compareScenarioBAtom);
  const vertical = useAtomValue(compareVerticalAtom);
  const mode = useAtomValue(compareLayoutModeAtom);

  // Empty state until a Scenario B is chosen (A always defaults to basecase).
  if (!scenarioB) {
    return (
      <div className={styles.container}>
        <CompareToolbar site={site} />
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>⚖️</div>
          <h2 className={styles.emptyTitle}>Select Two Scenarios to Compare</h2>
          <p className={styles.emptyHint}>
            Use the toolbar above to choose Scenario A and Scenario B, then select a vertical 
            (Coastal, Watershed, or Marine) and comparison mode (Diff or Swipe).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <CompareToolbar site={site} />
      
      <div className={styles.content}>
        {mode === 'swipe' ? (
          <CompareLayoutSwipe
            site={site}
            vertical={vertical}
            scenarioA={scenarioA}
            scenarioB={scenarioB}
          />
        ) : (
          <CompareLayoutDiffOverlay
            site={site}
            vertical={vertical}
            scenarioA={scenarioA}
            scenarioB={scenarioB}
          />
        )}
      </div>
    </div>
  );
}
