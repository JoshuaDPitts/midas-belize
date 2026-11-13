'use client';
import { useAtom } from 'jotai';
import { activeScenarioAtom } from '@/atoms';
import { SCENARIOS, getScenariosByGroup, type ScenarioId } from '@/features/scenarios/matrix';
import styles from './ScenarioPicker.module.css';

/** Pill row of scenarios from the canonical matrix. Click a pill to set
 * activeScenarioAtom (and trigger downstream useScenarioImpact). Grouped
 * by Urban-driven and SLR-driven. Marine outlook scenarios are not shown
 * for the Watershed vertical. */
export function ScenarioPicker() {
  const [active, setActive] = useAtom(activeScenarioAtom);

  const urbanScenarios = getScenariosByGroup('urban');
  const slrScenarios = getScenariosByGroup('slr');
  const baseScenario = SCENARIOS.find((s) => s.id === 'basecase')!;

  const isActive = (id: ScenarioId) => active === id;

  return (
    <section
      data-testid="scenario-picker"
      className={styles.section}
      aria-label="Scenarios"
    >
      <span className={styles.eyebrow}>Scenarios</span>
      
      {/* Base Case */}
      <div className={styles.pillRow} role="radiogroup" aria-label="Pick scenario">
        <button
          type="button"
          role="radio"
          aria-checked={isActive('basecase')}
          data-testid="scenario-pill-base"
          className={`${styles.pill} ${isActive('basecase') ? styles.pillActive : ''}`}
          onClick={() => setActive('basecase')}
          title={baseScenario.description}
        >
          {baseScenario.name}
        </button>
      </div>

      {/* Urban-driven scenarios */}
      {urbanScenarios.length > 0 && (
        <div className={styles.groupSection}>
          <span className={styles.groupLabel}>Urban-driven</span>
          <div className={styles.pillRow} role="radiogroup" aria-label="Urban-driven scenarios">
            {urbanScenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={isActive(s.id)}
                data-testid={`scenario-pill-${s.id}`}
                className={`${styles.pill} ${isActive(s.id) ? styles.pillActive : ''}`}
                onClick={() => setActive(s.id)}
                title={s.description}
              >
                {s.shortLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SLR-driven scenarios */}
      {slrScenarios.length > 0 && (
        <div className={styles.groupSection}>
          <span className={styles.groupLabel}>SLR-driven</span>
          <div className={styles.pillRow} role="radiogroup" aria-label="SLR-driven scenarios">
            {slrScenarios.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={isActive(s.id)}
                data-testid={`scenario-pill-${s.id}`}
                className={`${styles.pill} ${isActive(s.id) ? styles.pillActive : ''}`}
                onClick={() => setActive(s.id)}
                title={s.description}
              >
                {s.shortLabel}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
