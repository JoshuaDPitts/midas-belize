'use client';
import { useAtomValue, useSetAtom } from 'jotai';
import { selectedPolygonAtom, hoveredPolygonAtom, coastalResolutionAtom } from '@/atoms';
import type { SiteId } from '@/lib/map/core/constants';
import { useCoastalVulnerability } from '@/lib/data/hooks/useCoastalVulnerability';
import styles from './UrbanEncroachmentBars.module.css';

export interface UrbanEncroachmentBarsProps {
  site: SiteId | null;
}

export function UrbanEncroachmentBars({ site }: UrbanEncroachmentBarsProps) {
  const resolution = useAtomValue(coastalResolutionAtom);
  const selected = useAtomValue(selectedPolygonAtom);
  const setSelected = useSetAtom(selectedPolygonAtom);
  const setHovered = useSetAtom(hoveredPolygonAtom);

  const { rankedPolygons, loading } = useCoastalVulnerability(site, resolution);

  // Sort by urban ratio descending (data from hook may already be sorted by V,
  // so we re-sort here by urbanRatio for this chart)
  const sortedPolygons = [...rankedPolygons].sort(
    (a, b) => b.urbanRatio - a.urbanRatio,
  );

  const handleClick = (id: string) => {
    setSelected({ layerId: 'coastal-polygons', featureId: id });
  };

  const handleMouseEnter = (id: string) => {
    setHovered({ layerId: 'coastal-polygons', featureId: id });
  };

  const handleMouseLeave = () => {
    setHovered(null);
  };

  const isSelected = (id: string): boolean => {
    if (!selected) return false;
    return String(selected.featureId) === id && selected.layerId === 'coastal-polygons';
  };

  return (
    <div className={styles.panel} data-testid="urban-encroachment-panel">
      <header className={styles.header}>
        <span className={styles.headerTitle}>Urban Encroachment</span>
        <span className={styles.headerSubtitle}>per polygon, sorted by urban ratio</span>
      </header>

      {loading && (
        <div className={styles.loading} aria-live="polite">
          Loading…
        </div>
      )}

      {!loading && sortedPolygons.length === 0 && (
        <div className={styles.empty} data-testid="urban-encroachment-empty">
          No data available.
        </div>
      )}

      {sortedPolygons.length > 0 && (
        <div className={styles.barList} role="list">
          {sortedPolygons.map((polygon, i) => {
            const selected_ = isSelected(polygon.id);
            return (
              <div
                key={polygon.id}
                role="listitem"
                className={`${styles.barRow} ${selected_ ? styles.barRowSelected : ''}`}
                data-testid={`urban-bar-row-${i + 1}`}
                data-polygon-id={polygon.id}
                data-selected={selected_ ? 'true' : undefined}
                onClick={() => handleClick(polygon.id)}
                onMouseEnter={() => handleMouseEnter(polygon.id)}
                onMouseLeave={handleMouseLeave}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick(polygon.id);
                  }
                }}
                aria-label={`${polygon.id}: ${(polygon.urbanRatio * 100).toFixed(0)}% urban`}
              >
                {/* Label */}
                <span className={styles.barLabel}>{polygon.id}</span>

                {/* Bar track */}
                <span className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${Math.max(0, Math.min(1, polygon.urbanRatio)) * 100}%`,
                    }}
                    aria-hidden="true"
                  />
                </span>

                {/* Value */}
                <span className={styles.barValue}>
                  {(polygon.urbanRatio * 100).toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
