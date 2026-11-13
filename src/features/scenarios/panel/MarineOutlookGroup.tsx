import { MARINE_OUTLOOK_SCENARIOS } from '../matrix';
import type { ScenarioAvailabilityData } from './ScenariosPanel';
import styles from './MarineOutlookGroup.module.css';

interface MarineOutlookGroupProps {
  availability: Record<string, ScenarioAvailabilityData>;
}

export function MarineOutlookGroup({ availability }: MarineOutlookGroupProps) {
  // Check if any Marine outlook scenario has published datasets
  const hasAnyPublishedData = MARINE_OUTLOOK_SCENARIOS.some((outlook) => {
    const outlookAvailability = availability[outlook.id];
    return outlookAvailability?.marine.status !== 'missing';
  });

  // Hide section when no Marine outlook scenarios have any data
  if (!hasAnyPublishedData) {
    return null;
  }

  const handleOutlookClick = () => {
    // Display-only for v1 - Marine outlook scenarios don't fit into ScenarioId type
    // Future task will implement full activation
    console.log('Marine outlook scenarios will surface here once data is wired.');
  };

  return (
    <div className={styles.group}>
      <h3 className={styles.label}>Marine outlook</h3>
      <div className={styles.pills}>
        {MARINE_OUTLOOK_SCENARIOS.map((outlook) => {
          return (
            <button
              key={outlook.id}
              className={styles.pill}
              title={outlook.description}
              onClick={handleOutlookClick}
            >
              {outlook.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
