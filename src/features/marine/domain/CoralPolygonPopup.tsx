'use client';
import { useEffect, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  coralPopupAtom,
  coralClimateAtom,
  coralPlanAtom,
  coralYearAtom,
  coralSpeciesAtom,
  selectedPolygonAtom,
} from '@/atoms';
import { useMap } from '@/lib/map';
import { biomassToRgba } from '@/features/marine/map/biomassColorScale';
import { useCoralBiomass, CORAL_SCENARIOS } from './useCoralBiomass';
import styles from './CoralPolygonPopup.module.css';

function rgbaCss([r, g, b, a]: [number, number, number, number]): string {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toFixed(n >= 10 ? 0 : 1);
}

/**
 * Floating card anchored at the clicked Laughing Bird polygon. Shows the
 * per-species coral biomass breakdown for the active scenario + year, plus
 * the summed total. Repositions as the map pans/zooms; closes via its own
 * button, Escape (PolygonInteraction), or clicking another polygon.
 *
 * Rendered as a marine mapOverlay, so it lives inside the MapView container
 * and projects lng/lat → container pixels with the live MapLibre instance.
 */
export function CoralPolygonPopup() {
  const [popup, setPopup] = useAtom(coralPopupAtom);
  const setSelected = useSetAtom(selectedPolygonAtom);
  const climate = useAtomValue(coralClimateAtom);
  const plan = useAtomValue(coralPlanAtom);
  const year = useAtomValue(coralYearAtom);
  const activeSpecies = useAtomValue(coralSpeciesAtom);
  const map = useMap();
  const { speciesList, perPolygon, years, maxBiomassFor } = useCoralBiomass();

  const [pos, setPos] = useState<{
    x: number;
    y: number;
    placement: 'above' | 'below';
    caretDx: number;
  } | null>(null);

  // Track the anchor pixel as the camera moves, clamping the card inside the
  // map so it never clips off-screen or hides behind the (width-animating)
  // sidebar panel. The caret keeps pointing at the true polygon anchor even
  // when the card is nudged, and flips above/below near the top edge.
  useEffect(() => {
    if (!map || !popup) {
      setPos(null);
      return;
    }
    const CARD_W = 264;
    const MARGIN = 14;
    const APPROX_H = 230;
    const update = () => {
      const p = map.project(popup.lngLat);
      const container = map.getContainer().getBoundingClientRect();
      const sidebar =
        typeof document !== 'undefined'
          ? document.querySelector('[data-testid="appshell-sidebar-panel"]')
          : null;
      // The panel expands to 480px whenever a polygon is focused (which it
      // always is while this popup is open — see sidebarPanelWidthAtom). Its
      // left edge is stable during the 400ms width transition, so clamp
      // against the settled 480 target rather than the mid-animation width.
      const FOCUSED_PANEL_W = 480;
      let sidebarRight = 0;
      if (sidebar) {
        const sr = sidebar.getBoundingClientRect();
        const left = sr.left - container.left;
        sidebarRight = left + Math.max(sr.width, FOCUSED_PANEL_W) + MARGIN;
      }
      const minCenter = Math.max(sidebarRight, MARGIN) + CARD_W / 2;
      const maxCenter = container.width - MARGIN - CARD_W / 2;
      const clampedX =
        maxCenter >= minCenter ? Math.min(Math.max(p.x, minCenter), maxCenter) : p.x;
      const placement: 'above' | 'below' = p.y - APPROX_H < MARGIN ? 'below' : 'above';
      setPos({ x: clampedX, y: p.y, placement, caretDx: p.x - clampedX });
    };
    update();
    map.on('move', update);
    map.on('resize', update);
    return () => {
      map.off('move', update);
      map.off('resize', update);
    };
  }, [map, popup]);

  if (!popup || !pos) return null;

  const effectiveYear = year ?? (years.length > 0 ? Math.max(...years) : null);
  const scenario = CORAL_SCENARIOS.find((s) => s.climate === climate && s.plan === plan);

  const rows =
    effectiveYear === null
      ? []
      : speciesList.map((s) => ({
          ...s,
          biomass: perPolygon(climate, plan, effectiveYear, s.id).get(popup.polygonId) ?? 0,
        }));
  const total = rows.reduce((acc, r) => acc + r.biomass, 0);
  const localMax = rows.reduce((acc, r) => Math.max(acc, r.biomass), 0) || 1;

  function close() {
    setPopup(null);
    setSelected(null);
  }

  return (
    <div
      className={styles.popup}
      data-testid="coral-polygon-popup"
      data-placement={pos.placement}
      style={
        {
          left: pos.x,
          top: pos.y,
          '--caret-x': `calc(50% + ${pos.caretDx}px)`,
        } as React.CSSProperties
      }
    >
      <div
        className={styles.card}
        role="dialog"
        aria-label={`Coral biomass for reef polygon ${popup.polygonId}`}
      >
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Reef polygon</div>
          <div className={styles.polygonId}>#{popup.polygonId}</div>
        </div>
        <button type="button" className={styles.close} onClick={close} aria-label="Close popup">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M2 2 L12 12 M12 2 L2 12"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      <div className={styles.scenarioLine}>
        {scenario?.label ?? 'Scenario'}
        {effectiveYear !== null && <span className={styles.year}> · Year {effectiveYear}</span>}
      </div>

      {rows.length === 0 ? (
        <div className={styles.empty}>No biomass data for this scenario.</div>
      ) : (
        <ul className={styles.speciesList}>
          {rows.map((r) => {
            const dimmed = activeSpecies !== 'all' && activeSpecies !== r.id;
            const swatch = rgbaCss(biomassToRgba(r.biomass, maxBiomassFor(r.id)));
            return (
              <li
                key={r.id}
                className={`${styles.speciesRow} ${dimmed ? styles.dimmed : ''}`}
                data-active={activeSpecies === r.id ? 'true' : undefined}
              >
                <div className={styles.speciesHead}>
                  <span className={styles.swatch} style={{ background: swatch }} aria-hidden="true" />
                  <span className={styles.speciesName}>{r.name}</span>
                  <span className={styles.speciesValue}>{fmt(r.biomass)}</span>
                </div>
                <div className={styles.barTrack}>
                  <span
                    className={styles.barFill}
                    style={{
                      width: `${Math.max(2, (r.biomass / localMax) * 100)}%`,
                      background: swatch,
                    }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <footer className={styles.footer}>
        <span className={styles.totalLabel}>Total biomass</span>
        <span className={styles.totalValue}>{fmt(total)}</span>
      </footer>
      </div>
    </div>
  );
}
