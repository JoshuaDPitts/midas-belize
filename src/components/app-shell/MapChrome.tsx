'use client';
import { useAtomValue } from 'jotai';
import { basemapAtom, sidebarPanelAtom } from '@/atoms';
import { BASEMAPS } from '@/lib/map/core/styles';
import { AttributionBar } from '@/components/map/AttributionBar/AttributionBar';
import { BasemapSwitcher } from '@/components/map/BasemapSwitcher/BasemapSwitcher';
import { MapCoordinates } from '@/lib/map';
import { ZoomCluster } from './ZoomCluster';
import { MapExportMenu } from './MapExportMenu';
import { DrawToolbar } from './DrawToolbar';
import { MapDrawController } from './MapDrawController';
import { useResponsive } from './hooks/useResponsive';
import styles from './MapChrome.module.css';

/**
 * App-shell map chrome. Rendered inside <MapView> by MapArea so its children
 * can access map context. Global controls live in a RIGHT-edge column stacked
 * below the active vertical's encoder picker (the left edge is owned by the
 * SidebarRail/Panel). Later tasks add zoom, export, and draw tools to the
 * right column and coordinates + scale to the bottom-right slot. The draw
 * toolbar + controller mount only while the Inspect panel is open (draw
 * queries write the Inspect view).
 */
export function MapChrome() {
  const basemap = useAtomValue(basemapAtom);
  const panel = useAtomValue(sidebarPanelAtom);
  const isMobile = useResponsive();
  // Mobile (≤768px): keep zoom + basemap + scale bar; drop the export menu,
  // draw tools, and the cursor-coordinate chip (MC-011).
  const showDraw = panel === 'inspect' && !isMobile;
  const attribution = BASEMAPS[basemap]?.attribution ?? '';
  return (
    <div className={styles.chrome} data-testid="map-chrome">
      <div className={styles.rightColumn} data-testid="map-chrome-controls">
        <ZoomCluster />
        {!isMobile && <MapExportMenu />}
        {showDraw && <DrawToolbar />}
      </div>
      {showDraw && <MapDrawController />}
      <div className={styles.bottomRight} data-testid="map-chrome-bottom-right">
        <MapCoordinates showCoordinates={!isMobile} />
      </div>
      {/* Basemap switcher pinned to the very bottom-right, beneath the active
          vertical's legend (legends clear it via --map-basemap-dock-clearance). */}
      <div className={styles.basemapDock} data-testid="map-chrome-basemap">
        <BasemapSwitcher />
      </div>
      <div data-testid="map-chrome-attribution">
        <AttributionBar text={attribution} />
      </div>
    </div>
  );
}
