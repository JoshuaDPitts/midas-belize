import type { FlowDirection } from '@/types/mimes';
import styles from './DataCard.module.css';

interface DataCardProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: FlowDirection;
}

const TREND_ARROWS: Record<FlowDirection, string> = {
  increasing: '\u2191',
  decreasing: '\u2193',
  stable: '\u2192',
};

export function DataCard({ label, value, unit, trend }: DataCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
        {trend && (
          <span className={`${styles.trend} ${styles[trend]}`} data-testid="trend-indicator">
            {TREND_ARROWS[trend]}
          </span>
        )}
      </div>
    </div>
  );
}
