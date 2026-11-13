'use client';
import { useState, useCallback } from 'react';
import type { SiteId } from '@/lib/data/types';
import type { ScenarioId } from '../matrix';
import { MapView } from '@/lib/map';
import { CoastalMapLayers } from '@/features/coastal/map/CoastalMapLayers';
import { WatershedMapLayers } from '@/features/watershed/map/WatershedMapLayers';
import styles from './CompareLayoutSwipe.module.css';

export interface CompareLayoutSwipeProps {
  site: SiteId | null;
  vertical: 'coastal' | 'watershed' | 'marine';
  scenarioA: ScenarioId | null;
  scenarioB: ScenarioId | null;
}

/**
 * REQ-SC-024: CompareLayoutSwipe
 * 
 * Two-map vertical split layout with draggable curtain.
 * Top half shows scenario A, bottom half shows scenario B.
 * Both maps share viewport via the existing mapViewportAtom.
 */
export function CompareLayoutSwipe({
  site,
  vertical,
  scenarioA,
  scenarioB,
}: CompareLayoutSwipeProps) {
  const [splitPosition, setSplitPosition] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      
      const container = e.currentTarget;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const percentage = (y / rect.height) * 100;
      
      // Clamp between 10% and 90%
      const clamped = Math.max(10, Math.min(90, percentage));
      setSplitPosition(clamped);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Marine vertical empty state
  if (vertical === 'marine') {
    return (
      <div className={styles.empty} data-testid="compare-swipe">
        <p className={styles.emptyMessage}>
          Marine swipe comparison not yet available
        </p>
        <p className={styles.emptyHint}>
          Try switching to Coastal or Watershed vertical for side-by-side scenario comparison.
        </p>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      data-testid="compare-swipe"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top half: Scenario A */}
      <div
        className={styles.topMap}
        style={{ height: `${splitPosition}%` }}
      >
        <div className={styles.mapWrapper}>
          <MapView>
            {vertical === 'coastal' && <CoastalMapLayers />}
            {vertical === 'watershed' && <WatershedMapLayers />}
          </MapView>
        </div>
        <div className={styles.label} data-position="top">
          Scenario A
        </div>
      </div>

      {/* Draggable curtain */}
      <div
        className={styles.curtain}
        data-testid="swipe-curtain"
        onMouseDown={handleMouseDown}
        style={{ top: `${splitPosition}%` }}
      >
        <div className={styles.curtainHandle}>
          <div className={styles.curtainGrip} />
        </div>
      </div>

      {/* Bottom half: Scenario B */}
      <div
        className={styles.bottomMap}
        style={{ height: `${100 - splitPosition}%` }}
      >
        <div className={styles.mapWrapper}>
          <MapView>
            {vertical === 'coastal' && <CoastalMapLayers />}
            {vertical === 'watershed' && <WatershedMapLayers />}
          </MapView>
        </div>
        <div className={styles.label} data-position="bottom">
          Scenario B
        </div>
      </div>
    </div>
  );
}
