import { useAtom } from 'jotai';
import { activeScenarioAtom } from '@/atoms';
import { getScenariosByGroup, type ScenarioId } from '../matrix';
import type { ScenarioAvailabilityData } from './ScenariosPanel';
import { ScenarioAvailabilityBadges } from './ScenarioAvailabilityBadges';
import styles from './ScenarioMatrix.module.css';
import { useRef, type KeyboardEvent } from 'react';

interface ScenarioMatrixProps {
  availability: Record<string, ScenarioAvailabilityData>;
}

const GROUP_LABELS: Record<string, string> = {
  reference: 'Base Case',
  urban: 'Urban-driven',
  slr: 'SLR-driven',
};

function buildTitle(axes: { erosion: string; slr: string; urban: string }): string {
  return `Erosion: ${axes.erosion}, SLR: ${axes.slr}, Urban: ${axes.urban}`;
}

export function ScenarioMatrix({ availability }: ScenarioMatrixProps) {
  const [activeScenario, setActiveScenario] = useAtom(activeScenarioAtom);
  const groupRefs = useRef<Map<string, HTMLElement[]>>(new Map());

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, groupId: string, currentIndex: number) => {
    const groupButtons = groupRefs.current.get(groupId) || [];
    
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % groupButtons.length;
      groupButtons[nextIndex]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + groupButtons.length) % groupButtons.length;
      groupButtons[prevIndex]?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const scenarioId = groupButtons[currentIndex]?.getAttribute('data-scenario-id') as ScenarioId;
      if (scenarioId) {
        setActiveScenario(scenarioId);
      }
    }
  };

  const setButtonRef = (groupId: string, index: number) => (el: HTMLButtonElement | null) => {
    if (!el) return;
    const groupButtons = groupRefs.current.get(groupId) || [];
    groupButtons[index] = el;
    groupRefs.current.set(groupId, groupButtons);
  };

  return (
    <div className={styles.matrix}>
      {(['reference', 'urban', 'slr'] as const).map((group) => {
        const scenarios = getScenariosByGroup(group);
        if (scenarios.length === 0) return null;

        return (
          <div key={group} className={styles.group}>
            <h3 className={styles.groupLabel} id={`group-${group}`}>{GROUP_LABELS[group]}</h3>
            <div className={styles.cards} role="radiogroup" aria-labelledby={`group-${group}`}>
              {scenarios.map((scenario, index) => {
                const isActive = activeScenario === scenario.id;
                const scenarioAvailability = availability[scenario.id] || {
                  marine: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
                  watershed: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
                  coastal: { status: 'missing', publishedDatasets: [], partialDatasets: [], missingVariables: [] },
                };

                // Build descriptive label for screen readers
                const availabilitySummary = Object.entries(scenarioAvailability)
                  .map(([vertical, data]) => `${vertical}: ${data.status}`)
                  .join(', ');
                const ariaLabel = `${scenario.name}. ${buildTitle(scenario.axes)}. Availability: ${availabilitySummary}`;

                return (
                  <button
                    key={scenario.id}
                    ref={setButtonRef(group, index)}
                    className={`${styles.card} ${isActive ? styles.active : ''}`}
                    role="radio"
                    data-scenario-id={scenario.id}
                    aria-checked={isActive}
                    aria-label={ariaLabel}
                    title={buildTitle(scenario.axes)}
                    onClick={() => setActiveScenario(scenario.id)}
                    onKeyDown={(e) => handleKeyDown(e, group, index)}
                  >
                    <div className={styles.cardHeader}>
                      <span className={styles.shortLabel}>{scenario.shortLabel}</span>
                      <ScenarioAvailabilityBadges
                        scenarioId={scenario.id}
                        availability={scenarioAvailability}
                      />
                    </div>
                    <div className={styles.name} title={scenario.name}>
                      {scenario.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
