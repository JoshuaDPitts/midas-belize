import styles from './ContinuousLegend.module.css';

interface ContinuousLegendProps {
  colors: string[];
  label: string;
  unit?: string;
  /** Tuple [min, max] — when null, the legend renders without numeric bounds
   *  (aggregation layers whose domain is computed at render time). */
  domain?: [number, number] | null;
}

export function ContinuousLegend({ colors, label, unit, domain }: ContinuousLegendProps) {
  const gradient =
    colors.length >= 2
      ? `linear-gradient(to right, ${colors.join(', ')})`
      : colors[0] ?? 'transparent';
  return (
    <div className={styles.container}>
      <span className={styles.label}>
        {label}
        {unit && <span className={styles.unit}> ({unit})</span>}
      </span>
      <div className={styles.ramp} style={{ background: gradient }} data-ramp />
      {domain && (
        <div className={styles.bounds}>
          <span>{formatNum(domain[0])}</span>
          <span>{formatNum(domain[1])}</span>
        </div>
      )}
      {!domain && (
        <div className={styles.bounds}>
          <span>low</span>
          <span>high</span>
        </div>
      )}
    </div>
  );
}

function formatNum(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (Math.abs(n) >= 1) return n.toFixed(1);
  return n.toFixed(2);
}
