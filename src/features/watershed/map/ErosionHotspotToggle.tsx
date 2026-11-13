'use client';
import { useAtom } from 'jotai';
import { erosionHotspotEnabledAtom } from '@/atoms';
import styles from './ErosionHotspotToggle.module.css';

/** Map-chrome pill that toggles the erosion-hotspot heatmap on/off. Lives
 * below the WatershedLegend on the right edge of the map. */
export function ErosionHotspotToggle() {
  const [enabled, setEnabled] = useAtom(erosionHotspotEnabledAtom);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label="Show erosion hotspots"
      title="Shows 2 km hex bins aggregating RUSLE annual soil loss (A, t/ha/yr) at watershed centroids."
      data-testid="erosion-hotspot-toggle"
      className={`${styles.pill} ${enabled ? styles.pillOn : ''}`}
      onClick={() => setEnabled((v) => !v)}
    >
      <span aria-hidden className={styles.dot} />
      Show erosion hotspots
    </button>
  );
}
