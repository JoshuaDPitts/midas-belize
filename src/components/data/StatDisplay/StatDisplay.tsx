import styles from './StatDisplay.module.css';

interface StatDisplayProps {
  label: string;
  value: number | string;
  unit?: string;
  delta?: number;
}

export function StatDisplay({ label, value, unit, delta }: StatDisplayProps) {
  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
      </div>
      {delta !== undefined && (
        <span
          className={`${styles.delta} ${delta > 0 ? styles.positive : delta < 0 ? styles.negative : styles.neutral}`}
          data-delta
        >
          {delta > 0 ? '+' : ''}{delta}
        </span>
      )}
    </div>
  );
}
