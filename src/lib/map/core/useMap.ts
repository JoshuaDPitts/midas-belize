'use client';
import { useMapContext } from './MapContext';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapboxOverlay } from '@deck.gl/mapbox';

/** Returns the live MapLibre map (or null if not yet mounted). */
export function useMap(): MapLibreMap | null {
  return useMapContext().mapRef.current;
}

/** Returns the live Deck.gl MapboxOverlay (or null). */
export function useDeckOverlay(): MapboxOverlay | null {
  return useMapContext().overlayRef.current;
}
