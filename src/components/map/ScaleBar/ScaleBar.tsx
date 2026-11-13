import styles from './ScaleBar.module.css';

interface ScaleBarProps {
  /** Label to display next to the bar, e.g. "10 km". */
  label: string;
  /** Width of the bar in pixels. */
  widthPx: number;
}

export function ScaleBar({ label, widthPx }: ScaleBarProps) {
  if (!Number.isFinite(widthPx) || widthPx <= 0) return null;
  return (
    <div className={styles.bar} data-testid="scale-bar" aria-label={`Scale: ${label}`}>
      <div className={styles.segment} style={{ width: `${widthPx}px` }} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
