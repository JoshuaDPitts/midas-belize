import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { SWRConfig } from 'swr';
import { activeSiteAtom, inspectedFeatureAtom, type FeatureHit } from '@/atoms';
import { InspectTab } from '@/components/app-shell/panels/InspectTab';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';
import type { FeatureManifest } from '@/features/_types';

const layersFixture = {
  layers: [
    { id: 'marine-coral', layer: 'marine-coral', title: 'Coral', family: 'marine', scope: 'site' },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(layersFixture), { headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
});

function renderTab(opts: { features?: FeatureManifest[]; feature?: FeatureHit | null } = {}) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  if (opts.feature !== undefined) store.set(inspectedFeatureAtom, opts.feature);
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Provider store={store}>
        <FeaturesProvider value={opts.features ?? []}>
          <InspectTab />
        </FeaturesProvider>
      </Provider>
    </SWRConfig>,
  );
}

describe('REQ-LS-009 — InspectTab', () => {
  it('shows empty state when no feature inspected', () => {
    renderTab({ feature: null });
    expect(screen.getByTestId('inspect-empty')).toBeInTheDocument();
  });

  it('renders generic key/value when no formatter is registered', async () => {
    const f: FeatureHit = {
      layerId: 'marine-coral',
      featureId: 42,
      properties: { species: 'Acropora', biomass_pct: 0.41 },
      lngLat: [-88.36, 16.55],
    };
    renderTab({ feature: f });
    expect(await screen.findByTestId('inspect-feature')).toBeInTheDocument();
    expect(screen.getByText(/species/)).toBeInTheDocument();
    expect(screen.getByText(/Acropora/)).toBeInTheDocument();
  });

  it('uses a manifest formatter when one matches the layer family', async () => {
    function MarineFormatter({ feature }: { feature: FeatureHit }) {
      return <div data-testid="marine-formatter">{String(feature.properties.species)}</div>;
    }
    const m: FeatureManifest = {
      id: 'marine', label: 'Marine', icon: null,
      inspectFormatters: { marine: MarineFormatter },
    };
    const f: FeatureHit = {
      layerId: 'marine-coral', featureId: 1,
      properties: { species: 'Acropora' }, lngLat: [-88, 16],
    };
    renderTab({ feature: f, features: [m] });
    expect(await screen.findByTestId('marine-formatter')).toHaveTextContent('Acropora');
  });

  it('uses a manifest formatter when only the clicked feature layer id matches', async () => {
    function WatershedFormatter({ feature }: { feature: FeatureHit }) {
      return <div data-testid="watershed-formatter">{String(feature.properties.Name)}</div>;
    }
    const m: FeatureManifest = {
      id: 'watershed', label: 'Watershed', icon: null,
      inspectFormatters: { 'watershed-polygons': WatershedFormatter },
    };
    const f: FeatureHit = {
      layerId: 'watershed-polygons', featureId: 'Big Creek',
      properties: { Name: 'Big Creek' }, lngLat: [-88, 16],
    };
    renderTab({ feature: f, features: [m] });
    expect(await screen.findByTestId('watershed-formatter')).toHaveTextContent('Big Creek');
  });
});
