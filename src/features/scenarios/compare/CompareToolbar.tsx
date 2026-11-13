'use client';
import Link from 'next/link';
import { useAtom, useAtomValue } from 'jotai';
import {
  activeScenarioAtom,
  compareScenarioBAtom,
  compareVerticalAtom,
  compareLayoutModeAtom,
} from '@/atoms';
import type { SiteId } from '@/lib/map/core/constants';
import { SCENARIOS, MARINE_OUTLOOK_SCENARIOS } from '../matrix';
import { useCompareAvailability } from '../data/useCompareAvailability';
import { Select } from '@/components/ui/Select/Select';
import styles from './CompareToolbar.module.css';

export interface CompareToolbarProps {
  site: SiteId | null;
}

/**
 * REQ-SC-020: CompareToolbar
 * 
 * Renders:
 * - Back to map link
 * - Scenario A dropdown (activeScenarioAtom)
 * - vs separator
 * - Scenario B dropdown (compareScenarioBAtom)
 * - Vertical pills (Coastal/Watershed/Marine) with availability-based disable
 * - Mode toggle (Diff/Swipe)
 */
export function CompareToolbar({ site }: CompareToolbarProps) {
  const [scenarioA, setScenarioA] = useAtom(activeScenarioAtom);
  const [scenarioB, setScenarioB] = useAtom(compareScenarioBAtom);
  const [vertical, setVertical] = useAtom(compareVerticalAtom);
  const [mode, setMode] = useAtom(compareLayoutModeAtom);
  
  const availability = useCompareAvailability(site, scenarioA, scenarioB);

  // Build dropdown options: all scenarios + marine outlooks
  const allOptions = [
    ...SCENARIOS.map((s) => ({ value: s.id, label: s.name })),
    ...MARINE_OUTLOOK_SCENARIOS.map((m) => ({ value: m.id, label: m.name })),
  ];

  // Back link href
  const backHref = `/?site=${site ?? ''}&scenario=${scenarioA ?? ''}`;

  return (
    <div className={styles.toolbar} data-testid="compare-toolbar">
      {/* Back link */}
      <Link href={backHref} className={styles.backLink}>
        ← Back to map
      </Link>

      {/* Scenario A selector */}
      <div className={styles.scenarioSection}>
        <Select
          label="Scenario A"
          options={allOptions}
          value={scenarioA ?? 'basecase'}
          onChange={(val) => setScenarioA(val as any)}
        />
      </div>

      {/* vs separator */}
      <span className={styles.separator}>vs</span>

      {/* Scenario B selector */}
      <div className={styles.scenarioSection}>
        <Select
          label="Scenario B"
          options={allOptions}
          value={scenarioB ?? 'basecase'}
          onChange={(val) => setScenarioB(val as any)}
        />
      </div>

      {/* Vertical pills */}
      <div className={styles.verticalToggle} role="group" aria-label="Domain vertical">
        <button
          type="button"
          className={vertical === 'coastal' ? styles.pillActive : styles.pill}
          onClick={() => setVertical('coastal')}
          disabled={!availability.coastal.hasData}
          aria-pressed={vertical === 'coastal'}
        >
          Coastal
        </button>
        <button
          type="button"
          className={vertical === 'watershed' ? styles.pillActive : styles.pill}
          onClick={() => setVertical('watershed')}
          disabled={!availability.watershed.hasData}
          aria-pressed={vertical === 'watershed'}
        >
          Watershed
        </button>
        <button
          type="button"
          className={vertical === 'marine' ? styles.pillActive : styles.pill}
          onClick={() => setVertical('marine')}
          disabled={!availability.marine.hasData}
          aria-pressed={vertical === 'marine'}
        >
          Marine
        </button>
      </div>

      {/* Mode toggle */}
      <div className={styles.modeToggle} role="group" aria-label="Layout mode">
        <button
          type="button"
          className={mode === 'diff' ? styles.modeActive : styles.mode}
          onClick={() => setMode('diff')}
          aria-pressed={mode === 'diff'}
        >
          Diff
        </button>
        <button
          type="button"
          className={mode === 'swipe' ? styles.modeActive : styles.mode}
          onClick={() => setMode('swipe')}
          aria-pressed={mode === 'swipe'}
        >
          Swipe
        </button>
      </div>
    </div>
  );
}
