'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { mapViewportAtom, basemapAtom } from '@/atoms';
import { BASEMAPS } from './styles';
import { MIN_ZOOM, MAX_ZOOM } from './constants';
import { MapProvider } from './MapContext';
import { MapEngineProvider } from './MapEngineProvider';
import styles from './MapView.module.css';

interface MapViewProps {
  children?: ReactNode;
  /** Optional initial viewport override. */
  initial?: Partial<import('@/atoms').MapViewport>;
  /** Override the zoom clamp for this MapView instance (defaults to global MIN_ZOOM/MAX_ZOOM). */
  minZoom?: number;
  maxZoom?: number;
}

export function MapView({ children, initial, minZoom, maxZoom }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [viewport, setViewport] = useAtom(mapViewportAtom);
  const basemap = useAtomValue(basemapAtom);
  const firstViewport = useRef(viewport);
  // The basemap the live map instance was last styled with. Seeded with the
  // initial basemap because `new maplibregl.Map({ style })` already applies it
  // at construction — so the [basemap] effect must NOT re-`setStyle` on mount.
  const styledBasemap = useRef(basemap);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const v0 = { ...firstViewport.current, ...initial };
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASEMAPS[basemap].style as maplibregl.StyleSpecification | string,
      center: v0.center,
      zoom: v0.zoom,
      bearing: v0.bearing,
      pitch: v0.pitch,
      minZoom: minZoom ?? MIN_ZOOM,
      maxZoom: maxZoom ?? MAX_ZOOM,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true }, // needed for PNG export (ME-013)
    });

    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay as unknown as maplibregl.IControl);

    map.on('error', (e) => {
      // Surface tile-source / style failures so a broken basemap URL is
      // diagnosable (otherwise the map silently goes blank). Don't swallow
      // — re-log; production can wire this to telemetry.
      console.warn('[map-engine]', (e as unknown as { error?: Error }).error ?? e);
    });

    map.on('moveend', () => {
      const c = map.getCenter();
      setViewport({
        center: [c.lng, c.lat],
        zoom: Math.round(map.getZoom() * 100) / 100,
        bearing: Math.round(map.getBearing() * 10) / 10,
        pitch: Math.round(map.getPitch() * 10) / 10,
      });
    });

    mapRef.current = map;
    overlayRef.current = overlay;
    // Flip the ready flag after the current render has committed so child
    // components whose effects depend on a live map instance re-run.
    setIsReady(true);

    if (typeof window !== 'undefined') {
      (window as { __mapDebug?: () => { zoom: number; lng: number; lat: number } }).__mapDebug = () => {
        const c = map.getCenter();
        return { zoom: map.getZoom(), lng: c.lng, lat: c.lat };
      };
      // Test hook: expose map instance for Playwright assertions
      (window as { __mapInstance?: typeof map }).__mapInstance = map;
    }

    return () => {
      overlay.finalize?.();
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
      setIsReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Skip the initial run: the map is constructed with the current basemap's
    // style already, so re-`setStyle`ing here is redundant. Worse, the async
    // `styledata` `jumpTo` below would fire *after* any auto-fit-to-site the
    // child controllers ran on mount and clobber it back to the initial
    // viewport — the exact cause of the deep-link `?site=` auto-zoom failure.
    if (styledBasemap.current === basemap) return;
    styledBasemap.current = basemap;

    const t0 = performance.now();
    const prev = { center: map.getCenter(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch() };

    map.once('styledata', () => {
      map.jumpTo({ center: prev.center, zoom: prev.zoom, bearing: prev.bearing, pitch: prev.pitch });
      const elapsed = performance.now() - t0;
      if (elapsed > 500) console.warn(`[map-engine] basemap switch took ${Math.round(elapsed)}ms (target: 500ms)`);
    });

    map.setStyle(BASEMAPS[basemap].style as maplibregl.StyleSpecification | string, { diff: false });
  }, [basemap]);

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.map} />
      <MapProvider mapRef={mapRef} overlayRef={overlayRef} isReady={isReady}>
        <MapEngineProvider>{children}</MapEngineProvider>
      </MapProvider>
    </div>
  );
}
