import styles from './GraduatedLegend.module.css';

interface GraduatedLegendProps {
  breaks: number[];
  colors: string[];
  label: string;
  unit?: string;
}

export function GraduatedLegend({ breaks, colors, label, unit }: GraduatedLegendProps) {
  const min = breaks[0];
  const max = breaks[breaks.length - 1];
  return (
    <div className={styles.container}>
      <span className={styles.label}>{label}{unit && <span className={styles.unit}> ({unit})</span>}</span>
      <div className={styles.ramp}>
        {colors.map((color, i) => (
          <div key={i} className={styles.segment} data-segment style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className={styles.bounds}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
