'use client';
import type { SiteId } from '@/lib/data/types';
import type { ScenarioId } from '../matrix';
import { MapView } from '@/lib/map';
import { CoastalMapLayers } from '@/features/coastal/map/CoastalMapLayers';
import { WatershedMapLayers } from '@/features/watershed/map/WatershedMapLayers';
import styles from './CompareLayoutDiffOverlay.module.css';

export interface CompareLayoutDiffOverlayProps {
  site: SiteId | null;
  vertical: 'coastal' | 'watershed' | 'marine';
  scenarioA: ScenarioId | null;
  scenarioB: ScenarioId | null;
}

/**
 * REQ-SC-023: CompareLayoutDiffOverlay
 * 
 * Single map layout showing delta encoding (scenario B - scenario A).
 * Reuses vertical-specific MapLayers components with delta encoders.
 * 
 * For Coastal: uses existing scenarioDeltaEncoder
 * For Watershed: uses scenarioDeltaEncoder (added in this task)
 * For Marine: shows empty state (not yet implemented)
 */
export function CompareLayoutDiffOverlay({
  site,
  vertical,
  scenarioA,
  scenarioB,
}: CompareLayoutDiffOverlayProps) {
  // Marine vertical empty state
  if (vertical === 'marine') {
    return (
      <div className={styles.empty} data-testid="compare-diff-map">
        <p className={styles.emptyMessage}>
          Marine comparison not yet available
        </p>
        <p className={styles.emptyHint}>
          Try switching to Coastal or Watershed vertical to see scenario deltas.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="compare-diff-map">
      <MapView>
        {vertical === 'coastal' && <CoastalMapLayers />}
        {vertical === 'watershed' && <WatershedMapLayers />}
      </MapView>
    </div>
  );
}
