import type { InspectFormatterProps } from '@/features/_types';
import styles from './SSTPointFormatter.module.css';

const HEAT_STRESS_THRESHOLD_C = 31;

export function SSTPointFormatter({ feature }: InspectFormatterProps) {
  const props = feature.properties as Record<string, unknown>;
  const transect = String(props.transect ?? 'unknown transect');
  const sst = typeof props.sst_c === 'number' ? props.sst_c : null;
  const heatStress = sst !== null && sst > HEAT_STRESS_THRESHOLD_C;

  return (
    <article className={styles.card}>
      <header data-testid="sst-transect" className={styles.header}>{transect}</header>
      {sst !== null && (
        <div data-testid="sst-latest" className={styles.value}>
          {sst.toFixed(1)} <span className={styles.unit}>°C</span>
        </div>
      )}
      {heatStress && (
        <p data-testid="sst-heat-flag" className={styles.flag}>
          Above 31 °C bleaching threshold
        </p>
      )}
    </article>
  );
}
