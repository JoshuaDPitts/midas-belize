'use client';
import { useAtomValue } from 'jotai';
import { activeFeatureAtom } from '@/atoms';
import { MapView } from '@/lib/map';
import { MapChrome } from './MapChrome';
import { MapAutoFitController } from './MapAutoFitController';
import { useFeatures } from './hooks/useFeatures';
import styles from './MapArea.module.css';

/**
 * Mounts the Map Engine at the root of the AppShell, fills the viewport
 * behind the absolute-positioned chrome (NavBar / SidebarRail /
 * SidebarPanel / BottomBar).
 *
 * Renders `manifest.mapOverlays` contributions from registered Phase 2
 * verticals, but only from the *active* vertical (per activeFeatureAtom)
 * so multiple verticals can't pile their encoder pickers and legends
 * onto the same screen corners. Manifests without domainContent are
 * exempt: they always render, since they have nothing to compete with.
 *
 * Fallback when activeFeatureAtom is null: the first manifest contributing
 * domainContent wins, matching DomainTab's `useState(contribs[0]?.id)`
 * default. That keeps the marine vertical visible on cold loads where
 * the user hasn't touched the Domain sub-tabs yet.
 */
export function MapArea() {
  const features = useFeatures();
  const activeFeatureId = useAtomValue(activeFeatureAtom);

  const defaultVerticalId = features.find((f) => f.domainContent)?.id ?? null;
  const effectiveActiveId = activeFeatureId ?? defaultVerticalId;

  const overlays = features.flatMap((f) => {
    if (!f.mapOverlays) return [];
    if (!f.domainContent) return f.mapOverlays;
    return f.id === effectiveActiveId ? f.mapOverlays : [];
  });

  return (
    <div className={styles.area} data-testid="appshell-map-area">
      <MapView>
        <MapAutoFitController />
        <MapChrome />
        {overlays.map((Overlay, i) => (
          <Overlay key={i} />
        ))}
      </MapView>
    </div>
  );
}
