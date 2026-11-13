'use client';
import { PlaybackController } from '@/lib/map/interaction/PlaybackController';
import { useHasTimeAwareLayer } from './hooks/useHasTimeAwareLayer';
import { useFeatures } from './hooks/useFeatures';
import styles from './BottomBar.module.css';

/**
 * Floating glass bar at the bottom of the viewport that hosts the time
 * playback controls + attribution. Conditional: renders only when at least
 * one visible layer has a non-null `temporal_extent` in the catalog cache.
 *
 * Verticals can contribute extra widgets via `manifest.bottomBarWidgets`.
 */
export function BottomBar() {
  const show = useHasTimeAwareLayer();
  const features = useFeatures();
  if (!show) return null;
  const widgets = features.flatMap((f) => f.bottomBarWidgets ?? []);
  return (
    <div className={styles.bar} data-testid="appshell-bottom-bar">
      <PlaybackController />
      <div className={styles.attribution} data-testid="appshell-attribution">
        © OpenStreetMap · MIDAS Belize
        {widgets.map((W, i) => (
          <W key={i} />
        ))}
      </div>
    </div>
  );
}
