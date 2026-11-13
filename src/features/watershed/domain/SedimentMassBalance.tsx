'use client';
import { useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  activeSiteAtom,
  activeScenarioAtom,
  activeFeatureAtom,
  selectedPolygonAtom,
} from '@/atoms';
import {
  useMassBalanceForSite,
  DEFAULT_DELIVERY_RATIO,
  DEFAULT_FATES_SPLIT,
} from '@/lib/data/hooks/useMassBalance';
import { getScenario } from '@/features/scenarios/matrix';
import { SedimentFlowSankey } from './SedimentFlowSankey';
import styles from './SedimentMassBalance.module.css';

/** Tier 3 orchestrator: wraps the Sankey + an expandable formula card
 * (mass-balance identity + RUSLE 5-factor breakdown + delivery-ratio
 * caveat). When a scenario is active, the Sankey switches to delta-mode
 * (today renders the base case + a 'Showing: {scenario}' subtitle; full
 * delta-Sankey is a WS-042 follow-up once scenario watershed datasets
 * publish — see WS-033 honest-data note). */
export function SedimentMassBalance() {
  const site = useAtomValue(activeSiteAtom);
  const scenarioId = useAtomValue(activeScenarioAtom);
  const setActiveFeature = useSetAtom(activeFeatureAtom);
  const setActiveSite = useSetAtom(activeSiteAtom);
  const setSelectedPolygon = useSetAtom(selectedPolygonAtom);
  const balance = useMassBalanceForSite(site);
  const [formulaOpen, setFormulaOpen] = useState(false);

  const scenarioName =
    scenarioId === null || scenarioId === 'basecase'
      ? null
      : getScenario(scenarioId).name;

  return (
    <section
      data-testid="sediment-mass-balance"
      className={styles.section}
      aria-label="Sediment mass balance"
    >
      <header className={styles.header}>
        <h3 className={styles.title}>Sediment mass balance</h3>
        {scenarioName !== null && (
          <span className={styles.scenarioLabel} data-testid="sediment-mass-balance-subtitle">
            Showing: {scenarioName}
          </span>
        )}
      </header>

      <SedimentFlowSankey
        sources={balance.sources}
        transport={balance.transport}
        fates={balance.fates}
        total={balance.total}
        onFateClick={(fate) => {
          // WS-044 bridge: clicking the Nearshore-export fate jumps to
          // Marine@LBC where the downstream reef impact lives. The other
          // two fates stay in-vertical (coastal deposition and offshore
          // export don't have dedicated cross-vertical views in v1).
          if (fate === 'nearshore') {
            setSelectedPolygon(null);
            setActiveSite('laughing-bird');
            setActiveFeature('marine');
          }
        }}
      />

      <button
        type="button"
        data-testid="sediment-mass-balance-formula-toggle"
        className={styles.formulaToggle}
        aria-expanded={formulaOpen}
        onClick={() => setFormulaOpen((s) => !s)}
      >
        {formulaOpen ? 'Hide methodology' : 'Show methodology'}
      </button>
      {formulaOpen && (
        <div
          className={styles.formulaCard}
          data-testid="sediment-mass-balance-formula"
          id="watershed-sediment-formula"
        >
          <p className={styles.formulaLine}>
            <strong>Per watershed:</strong> <code>yield_t/yr = A_t/ha/yr × area_ha</code>
          </p>
          <p className={styles.formulaLine}>
            <strong>RUSLE A:</strong>{' '}
            <code>A = R × K × LS × C × P</code>{' '}
            (see the polygon's RUSLE card for current values)
          </p>
          <p className={styles.formulaLine}>
            <strong>Delivery:</strong>{' '}
            <code>drainage_t/yr = total_yield × {balance.deliveryRatio.toFixed(2)}</code>{' '}
            <span className={styles.caveat}>(sediment delivery ratio, content-review pending)</span>
          </p>
          <p className={styles.formulaLine}>
            <strong>Fates:</strong>{' '}
            <code>coastal {Math.round(DEFAULT_FATES_SPLIT.coastal * 100)}% · nearshore {Math.round(DEFAULT_FATES_SPLIT.nearshore * 100)}% · offshore {Math.round(DEFAULT_FATES_SPLIT.offshore * 100)}%</code>
            <span className={styles.caveat}> (default split, refine per site)</span>
          </p>
          <p className={styles.totalLine}>
            <strong>Site total:</strong>{' '}
            <code>{balance.total.toFixed(1)} t/yr</code>{' '}
            {balance.deliveryRatio !== DEFAULT_DELIVERY_RATIO && (
              <span className={styles.caveat}>(delivery ratio override)</span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}

