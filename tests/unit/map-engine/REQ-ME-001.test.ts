import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { createElement, useRef, type ReactNode } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import type { MapboxOverlay } from '@deck.gl/mapbox';
import { MapProvider, useMapContext } from '@/lib/map/core/MapContext';
import { useMap, useDeckOverlay } from '@/lib/map/core/useMap';

// Integration surface for ME-001 that is pure-unit-testable: context hooks +
// provider ref exposure. The live MapLibre + Deck.gl integration itself is
// covered by tests/e2e/map-engine-visual.spec.ts and map-engine-functional.spec.ts
// since jsdom has no WebGL.

describe('REQ-ME-001 · context hooks', () => {
  it('useMapContext throws when used outside MapProvider', () => {
    expect(() => renderHook(() => useMapContext())).toThrowError(
      /useMapContext must be used inside <MapView>/,
    );
  });

  it('useMap throws when used outside MapProvider', () => {
    expect(() => renderHook(() => useMap())).toThrow();
  });

  it('useDeckOverlay throws when used outside MapProvider', () => {
    expect(() => renderHook(() => useDeckOverlay())).toThrow();
  });
});

describe('REQ-ME-001 · MapProvider ref exposure', () => {
  function makeWrapper(
    map: MapLibreMap | null,
    overlay: MapboxOverlay | null,
  ): ({ children }: { children: ReactNode }) => ReactNode {
    return function Wrapper({ children }) {
      const mapRef = useRef<MapLibreMap | null>(map);
      const overlayRef = useRef<MapboxOverlay | null>(overlay);
      return createElement(MapProvider, { mapRef, overlayRef, isReady: true, children });
    };
  }

  it('useMap returns null when mapRef.current is null', () => {
    const { result } = renderHook(() => useMap(), { wrapper: makeWrapper(null, null) });
    expect(result.current).toBeNull();
  });

  it('useMap returns the mapRef value when present', () => {
    const fakeMap = { __id: 'fake-map' } as unknown as MapLibreMap;
    const { result } = renderHook(() => useMap(), { wrapper: makeWrapper(fakeMap, null) });
    expect(result.current).toBe(fakeMap);
  });

  it('useDeckOverlay returns the overlayRef value when present', () => {
    const fakeOverlay = { __id: 'fake-overlay' } as unknown as MapboxOverlay;
    const { result } = renderHook(() => useDeckOverlay(), { wrapper: makeWrapper(null, fakeOverlay) });
    expect(result.current).toBe(fakeOverlay);
  });

  it('useMapContext exposes both refs', () => {
    const fakeMap = { __id: 'm' } as unknown as MapLibreMap;
    const fakeOverlay = { __id: 'o' } as unknown as MapboxOverlay;
    const { result } = renderHook(() => useMapContext(), { wrapper: makeWrapper(fakeMap, fakeOverlay) });
    expect(result.current.mapRef.current).toBe(fakeMap);
    expect(result.current.overlayRef.current).toBe(fakeOverlay);
  });
});
