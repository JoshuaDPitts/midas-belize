'use client';
import { useAtomValue } from 'jotai';
import { activeScenarioAtom } from '@/atoms';
import { useScenarioImpact } from '@/lib/data/hooks/useScenarioImpact';
import { ScenarioPicker } from './ScenarioPicker';
import { WatershedCoastDelta } from './WatershedCoastDelta';
import { ScenarioTimeSeries } from './ScenarioTimeSeries';
import { MarineDownstreamHint } from './MarineDownstreamHint';
import styles from './ScenarioImpactPanel.module.css';

/** Tier 4 panel orchestrator. Stitches together the WS-034..037 pieces
 * around a single `activeScenarioAtom`-driven `useScenarioImpact` call.
 * Renders the picker unconditionally; the delta + projection visuals
 * render whenever data is available and degrade to empty states
 * otherwise. */
export function ScenarioImpactPanel() {
  const scenarioId = useAtomValue(activeScenarioAtom);
  const { watershedDeltas, coastDeltas, marineImpact } = useScenarioImpact(scenarioId);

  return (
    <section
      data-testid="watershed-scenario-impact-panel"
      className={styles.panel}
      aria-label="Scenario impact"
    >
      <ScenarioPicker />
      {scenarioId !== null && scenarioId !== 'basecase' && (
        <>
          <WatershedCoastDelta
            watershedDeltas={watershedDeltas}
            coastDeltas={coastDeltas}
          />
          <ScenarioTimeSeries base={[]} scenario={[]} />
          <MarineDownstreamHint marineImpact={marineImpact} />
        </>
      )}
    </section>
  );
}
