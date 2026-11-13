import styles from './CoordinateDisplay.module.css';

interface CoordinateDisplayProps {
  lat: number;
  lon: number;
}

export function CoordinateDisplay({ lat, lon }: CoordinateDisplayProps) {
  return (
    <span className={styles.coords}>
      {lat.toFixed(5)}, {lon.toFixed(5)}
    </span>
  );
}
