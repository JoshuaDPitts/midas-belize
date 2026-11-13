import type { Scenario } from '@/types/mimes';
import styles from './ComparisonPanel.module.css';

interface ComparisonPanelProps {
  scenarioA: Scenario;
  scenarioB: Scenario;
}

export function ComparisonPanel({ scenarioA, scenarioB }: ComparisonPanelProps) {
  const allKeys = [...new Set([...Object.keys(scenarioA.assumptions), ...Object.keys(scenarioB.assumptions)])];

  return (
    <div className={styles.panel}>
      <div className={styles.headers}>
        <span className={styles.header}>{scenarioA.name}</span>
        <span className={styles.paramHeader}>Parameter</span>
        <span className={styles.header}>{scenarioB.name}</span>
      </div>
      {allKeys.map((key) => {
        const valA = String(scenarioA.assumptions[key] ?? '\u2014');
        const valB = String(scenarioB.assumptions[key] ?? '\u2014');
        const differs = valA !== valB;
        return (
          <div key={key} className={styles.row} data-diff={differs}>
            <span className={`${styles.value} ${differs ? styles.diffValue : ''}`}>{valA}</span>
            <span className={styles.param}>{key}</span>
            <span className={`${styles.value} ${differs ? styles.diffValue : ''}`}>{valB}</span>
          </div>
        );
      })}
    </div>
  );
}
