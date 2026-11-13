'use client';
// src/lib/map/core/MapCoordinates.tsx
// ME-012 — cursor coordinate display + scale bar + click-to-copy.
//
// Mounted as a child of <MapView>. Listens to MapLibre `mousemove` to
// track cursor lng/lat (throttled per animation frame) and to `move` /
// `resize` to refresh the scale bar. Wraps the DS CoordinateDisplay in
// a clickable affordance that copies `lat,lon` to the clipboard with a
// brief "Copied" confirmation.

import { useEffect, useRef, useState } from 'react';
import { useMapContext } from './MapContext';
import { CoordinateDisplay } from '@/components/map/CoordinateDisplay/CoordinateDisplay';
import { ScaleBar } from '@/components/map/ScaleBar/ScaleBar';
import { computeScaleBar } from './scaleBar';
import styles from './MapCoordinates.module.css';

export interface MapCoordinatesProps {
  /** Target pixel width for the scale bar. Default 100. */
  scaleBarTargetPx?: number;
  /** How long the "Copied" confirmation stays on screen, in ms. Default 1200. */
  copyConfirmMs?: number;
  /** Render the cursor-coordinate + copy chip. Default true. Set false on
   *  mobile to keep the scale bar but drop the coordinate readout (MC-011). */
  showCoordinates?: boolean;
}

export function MapCoordinates({
  scaleBarTargetPx = 100,
  copyConfirmMs = 1200,
  showCoordinates = true,
}: MapCoordinatesProps) {
  const { mapRef, isReady } = useMapContext();
  const [cursor, setCursor] = useState<{ lat: number; lng: number } | null>(null);
  const [scale, setScale] = useState<{ label: string; widthPx: number }>({
    label: '—',
    widthPx: 0,
  });
  const [copied, setCopied] = useState(false);
  const rafRef = useRef<number | null>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isReady) return;
    const map = mapRef.current;
    if (!map) return;

    const applyScale = () => {
      const center = map.getCenter();
      const out = computeScaleBar(center.lat, map.getZoom(), scaleBarTargetPx);
      setScale({ label: out.label, widthPx: out.widthPx });
    };

    const onMove = (e: import('maplibre-gl').MapMouseEvent) => {
      if (rafRef.current !== null) return; // coalesce per frame
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setCursor({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    };

    map.on('mousemove', onMove);
    map.on('move', applyScale);
    map.on('resize', applyScale);
    applyScale();

    return () => {
      map.off('mousemove', onMove);
      map.off('move', applyScale);
      map.off('resize', applyScale);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [mapRef, isReady, scaleBarTargetPx]);

  const handleCopy = async () => {
    if (!cursor) return;
    const text = `${cursor.lat.toFixed(5)},${cursor.lng.toFixed(5)}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for environments without async clipboard (older iOS Safari,
        // some embedded WebViews). execCommand is deprecated but still works.
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'absolute';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), copyConfirmMs);
    } catch {
      /* user rejected clipboard permission — silently ignore */
    }
  };

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current !== null) window.clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  return (
    <div className={styles.dock}>
      <ScaleBar label={scale.label} widthPx={scale.widthPx} />
      {showCoordinates && (
        <button
          type="button"
          className={styles.copyBtn}
          onClick={handleCopy}
          disabled={!cursor}
          aria-label="Copy cursor coordinates"
          data-testid="coord-copy"
        >
          {cursor ? (
            <CoordinateDisplay lat={cursor.lat} lon={cursor.lng} />
          ) : (
            <span className={styles.hint}>move cursor over map</span>
          )}
          {copied && (
            <span className={styles.toast} role="status" data-testid="coord-copied">
              Copied
            </span>
          )}
        </button>
      )}
    </div>
  );
}
