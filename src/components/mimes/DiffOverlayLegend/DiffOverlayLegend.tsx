import styles from './DiffOverlayLegend.module.css';

interface DiffOverlayLegendProps {
  min: number;
  max: number;
  unit: string;
  scenarioA: string;
  scenarioB: string;
}

export function DiffOverlayLegend({ min, max, unit, scenarioA, scenarioB }: DiffOverlayLegendProps) {
  return (
    <div className={styles.container}>
      <div className={styles.labels}>
        <span className={styles.scenario}>{scenarioA}</span>
        <span className={styles.vs}>vs</span>
        <span className={styles.scenario}>{scenarioB}</span>
      </div>
      <div className={styles.bar} data-colorbar />
      <div className={styles.bounds}>
        <span>{min}</span>
        <span>0</span>
        <span>{max}</span>
      </div>
      <span className={styles.unit}>{unit}</span>
    </div>
  );
}
