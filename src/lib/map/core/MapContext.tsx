'use client';
import { createContext, useContext, type RefObject, type ReactNode } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapboxOverlay } from '@deck.gl/mapbox';

interface MapContextValue {
  mapRef: RefObject<MapLibreMap | null>;
  overlayRef: RefObject<MapboxOverlay | null>;
  /** Flips true once the MapLibre instance has finished initializing.
   *  Child components that attach map listeners gate their effect on this
   *  flag so they re-run once the map is actually available (React runs
   *  child effects before the parent's, so reading mapRef on first mount
   *  always sees null). */
  isReady: boolean;
}

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({
  mapRef,
  overlayRef,
  isReady,
  children,
}: {
  mapRef: RefObject<MapLibreMap | null>;
  overlayRef: RefObject<MapboxOverlay | null>;
  isReady: boolean;
  children: ReactNode;
}) {
  return (
    <MapContext.Provider value={{ mapRef, overlayRef, isReady }}>
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext(): MapContextValue {
  const ctx = useContext(MapContext);
  if (!ctx) throw new Error('useMapContext must be used inside <MapView>');
  return ctx;
}
