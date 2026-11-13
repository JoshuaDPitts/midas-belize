import type { Scenario } from '@/types/mimes';
import styles from './ParameterCard.module.css';

interface ParameterCardProps {
  scenario: Scenario;
}

export function ParameterCard({ scenario }: ParameterCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.name}>{scenario.name}</span>
      <span className={styles.desc}>{scenario.description}</span>
      <div className={styles.params}>
        {Object.entries(scenario.assumptions).map(([key, val]) => (
          <div key={key} className={styles.param}>
            <span className={styles.paramKey}>{key}</span>
            <span className={styles.paramVal}>{String(val)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
