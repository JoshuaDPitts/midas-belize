'use client';
import { useAtom } from 'jotai';
import { activeScenarioAtom } from '@/atoms';
import { SCENARIOS, type ScenarioId, type ScenarioDef } from '@/features/scenarios/matrix';
import styles from './ScenarioPicker.module.css';

// ---------------------------------------------------------------------------
// Scenario Matrix
// ---------------------------------------------------------------------------
const URBAN_SCENARIOS = SCENARIOS.filter((s) => s.group === 'urban');
const SLR_SCENARIOS   = SCENARIOS.filter((s) => s.group === 'slr');
const BASE_SCENARIO   = SCENARIOS.find((s) => s.group === 'reference')!;

function pillTitle(s: ScenarioDef): string {
  return `Erosion: ${s.axes.erosion} | SLR: ${s.axes.slr} | Urban: ${s.axes.urban}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function ScenarioPicker() {
  const [scenario, setScenario] = useAtom(activeScenarioAtom);

  const isActive = (id: ScenarioId | null) => scenario === id;

  return (
    <div className={styles.root} data-testid="scenario-picker">
      {/* Base Case — always first */}
      <div className={styles.referenceRow}>
        <button
          type="button"
          className={`${styles.pill} ${isActive('basecase') ? styles.pillActive : ''}`}
          aria-pressed={isActive('basecase')}
          aria-label={`${BASE_SCENARIO.name}: Erosion ${BASE_SCENARIO.axes.erosion}, SLR ${BASE_SCENARIO.axes.slr}, Urban ${BASE_SCENARIO.axes.urban}`}
          title={pillTitle(BASE_SCENARIO)}
          onClick={() => setScenario('basecase')}
        >
          {BASE_SCENARIO.name}
        </button>
      </div>

      {/* Urban-driven group */}
      <div
        className={styles.group}
        role="radiogroup"
        aria-label="Urban-driven scenarios"
      >
        <span className={styles.groupLabel}>Urban-driven</span>
        <div className={styles.pills}>
          {URBAN_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.pill} ${isActive(s.id) ? styles.pillActive : ''}`}
              aria-pressed={isActive(s.id)}
              aria-label={`${s.name}: Erosion ${s.axes.erosion}, SLR ${s.axes.slr}, Urban ${s.axes.urban}`}
              title={pillTitle(s)}
              onClick={() => setScenario(s.id)}
            >
              {s.id}
            </button>
          ))}
        </div>
      </div>

      {/* SLR-driven group */}
      <div
        className={styles.group}
        role="radiogroup"
        aria-label="SLR-driven scenarios"
      >
        <span className={styles.groupLabel}>SLR-driven</span>
        <div className={styles.pills}>
          {SLR_SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.pill} ${isActive(s.id) ? styles.pillActive : ''}`}
              aria-pressed={isActive(s.id)}
              aria-label={`${s.name}: Erosion ${s.axes.erosion}, SLR ${s.axes.slr}, Urban ${s.axes.urban}`}
              title={pillTitle(s)}
              onClick={() => setScenario(s.id)}
            >
              {s.id}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
