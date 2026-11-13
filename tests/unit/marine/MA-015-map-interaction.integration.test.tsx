// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { SWRConfig } from 'swr';
import { activeSiteAtom, selectedPolygonAtom, marineEncodingAtom } from '@/atoms';
import { MarineMapLayers } from '@/features/marine/map/MarineMapLayers';

// Capture the layers passed via setProps.
const captured: { lastLayers?: any[] } = {};

// Mock the Map Engine layer registration.
vi.mock('@/lib/map', async () => {
  const actual = await vi.importActual<typeof import('@/lib/map')>('@/lib/map');
  return {
    ...actual,
    useDeckOverlay: () => ({
      setProps: (props: { layers?: any[] }) => {
        if (props.layers) captured.lastLayers = props.layers;
      },
    }),
    useMap: () => null, // skip fly-to in tests
  };
});

const sampleFC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[-88.4, 16.5], [-88.3, 16.5], [-88.3, 16.6], [-88.4, 16.6], [-88.4, 16.5]]],
      },
      properties: { MIMES_ID: 17, NbS_Score: 0.5 },
    },
  ],
};

beforeEach(() => {
  captured.lastLayers = undefined;
  global.fetch = vi.fn(
    async () => new Response(JSON.stringify(sampleFC), { headers: { 'Content-Type': 'application/json' } }),
  ) as typeof fetch;
});

describe('MA-015 — click-to-select (integration)', () => {
  it('clicking a polygon (simulated via deck.gl onClick) sets selectedPolygonAtom', async () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(marineEncodingAtom, 'nbs');
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <Provider store={store}>
          <MarineMapLayers />
        </Provider>
      </SWRConfig>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(captured.lastLayers).toBeDefined();
    const layers = captured.lastLayers ?? [];
    const polyLayer = layers.find((l: any) => l.id === 'marine-placencia-marine-nbs-scores') as any;
    expect(polyLayer).toBeDefined();

    polyLayer.props.onClick({ object: { properties: { MIMES_ID: 17, NbS_Score: 0.5 } } });

    expect(store.get(selectedPolygonAtom)).toEqual({
      layerId: 'placencia-marine-nbs-scores',
      featureId: 17,
    });
  });

  it('clicking with object null is a no-op (no selection set)', async () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(marineEncodingAtom, 'nbs');
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <Provider store={store}>
          <MarineMapLayers />
        </Provider>
      </SWRConfig>,
    );

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const layers = captured.lastLayers ?? [];
    const polyLayer = layers.find((l: any) => l.id === 'marine-placencia-marine-nbs-scores') as any;
    polyLayer?.props.onClick({ object: null });

    expect(store.get(selectedPolygonAtom)).toBeNull();
  });
});
