import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { SWRConfig } from 'swr';
import { activeSiteAtom, queryResultAtom, type QueryResult } from '@/atoms';
import { InspectTab } from '@/components/app-shell/panels/InspectTab';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify({ layers: [] }), { headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
});

function renderWith(value: QueryResult) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  store.set(queryResultAtom, value);
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Provider store={store}>
        <FeaturesProvider value={[]}>
          <InspectTab />
        </FeaturesProvider>
      </Provider>
    </SWRConfig>,
  );
}

describe('REQ-LS-010 — InspectTab multi-feature + transect', () => {
  it('renders summary stats for an area query', () => {
    renderWith({
      kind: 'area',
      summaries: [
        { layerId: 'marine-coral', count: 12, numeric: { biomass_pct: { count: 12, sum: 6, mean: 0.5, min: 0.1, max: 0.9, stddev: 0.2 } } },
      ],
    });
    expect(screen.getByTestId('inspect-area')).toBeInTheDocument();
    expect(screen.getByText(/marine-coral/)).toBeInTheDocument();
    expect(screen.getByText(/biomass_pct/)).toBeInTheDocument();
  });

  it('renders a transect profile chart', () => {
    renderWith({
      kind: 'transect',
      profile: {
        samples: [
          { distance: 0,   lngLat: [-88, 16], values: { 'marine-coral': { biomass_pct: 0.1 } } },
          { distance: 0.5, lngLat: [-88, 16], values: { 'marine-coral': { biomass_pct: 0.7 } } },
          { distance: 1.0, lngLat: [-88, 16], values: { 'marine-coral': { biomass_pct: 0.4 } } },
        ],
        vectorHits: [],
      },
    });
    expect(screen.getByTestId('inspect-transect')).toBeInTheDocument();
    expect(screen.getByTestId('transect-svg')).toBeInTheDocument();
  });
});
