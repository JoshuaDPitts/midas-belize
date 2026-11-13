import { Icon } from '@/lib/icons';
import styles from './ZoomControls.module.css';

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut }: ZoomControlsProps) {
  return (
    <div className={styles.controls}>
      <button className={styles.button} onClick={onZoomIn} aria-label="Zoom in">
        <Icon name="zoom-in" size={16} />
      </button>
      <span className={styles.level}>{zoom}</span>
      <button className={styles.button} onClick={onZoomOut} aria-label="Zoom out">
        <Icon name="zoom-out" size={16} />
      </button>
    </div>
  );
}
