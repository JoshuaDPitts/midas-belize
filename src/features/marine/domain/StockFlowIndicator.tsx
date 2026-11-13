import { Icon } from '@/lib/icons';
import type { FlowDirection } from '@/types/mimes';
import styles from './StockFlowIndicator.module.css';

interface StockFlowIndicatorProps {
  label: string;
  value: number | string;
  unit: string;
  direction: FlowDirection;
}

const DIRECTION_ICONS: Record<FlowDirection, string> = {
  increasing: 'trending-up',
  decreasing: 'trending-down',
  stable: 'line',
};

export function StockFlowIndicator({ label, value, unit, direction }: StockFlowIndicatorProps) {
  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}</span>
      <div className={styles.valueRow}>
        <span data-testid="stockflow-value" className={styles.value}>{value}</span>
        <span className={styles.unit}>{unit}</span>
        <span
          data-testid="stockflow-arrow"
          data-direction={direction}
          className={`${styles.arrow} ${styles[direction]}`}
          aria-label={`${direction} trend`}
        >
          <Icon name={DIRECTION_ICONS[direction]} size={14} />
        </span>
      </div>
    </div>
  );
}
