import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider, createStore, useAtomValue } from 'jotai';
import { SWRConfig } from 'swr';
import {
  _layerCatalogCacheAtom,
  _scenariosCacheAtom,
  useCacheBridgeProvider,
} from '@/atoms/cache-bridge';

function Probe() {
  useCacheBridgeProvider({ activeSite: 'placencia' });
  const layers = useAtomValue(_layerCatalogCacheAtom);
  const scenarios = useAtomValue(_scenariosCacheAtom);
  return (
    <span data-testid="probe">
      L:{layers.length} S:{scenarios.length}
    </span>
  );
}

describe('REQ-SM-014 — cache-bridge mirrors SWR into atoms', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = String(url);
      if (u.includes('/api/layers/')) {
        return new Response(
          JSON.stringify({ layers: [{ id: 'a' }, { id: 'b' }] }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.includes('/api/scenarios/')) {
        return new Response(
          JSON.stringify({ scenarios: [{ id: 's1' }] }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}');
    }) as typeof fetch;
  });

  it('mirrors useLayersForSite + useScenarios into cache atoms', async () => {
    const store = createStore();
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <Provider store={store}>
          <Probe />
        </Provider>
      </SWRConfig>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('probe')).toHaveTextContent('L:2 S:1'),
    );
  });

  it('updates cache atoms when activeSite changes', async () => {
    const store = createStore();
    function Multi() {
      useCacheBridgeProvider({ activeSite: 'caye-caulker' });
      const layers = useAtomValue(_layerCatalogCacheAtom);
      return <span data-testid="probe">L:{layers.length}</span>;
    }
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <Provider store={store}>
          <Multi />
        </Provider>
      </SWRConfig>,
    );
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('L:2'));
  });
});
