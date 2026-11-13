import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { SWRConfig } from 'swr';
import { activeSiteAtom, marineEncodingAtom } from '@/atoms';
import { MarineMapLayers, buildLayerConfigsForSite } from '@/features/marine/map/MarineMapLayers';
import { EncoderPicker } from '@/features/marine/map/EncoderPicker';
import { MapLegend } from '@/features/marine/map/MapLegend';

// Stub the map context so MarineMapLayers can render in a unit test
// without a live MapLibre/Deck.gl overlay.
vi.mock('@/lib/map/core/MapContext', () => ({
  useMapContext: () => ({
    mapRef: { current: null },
    overlayRef: { current: null },
    isReady: false,
  }),
}));

const sampleFC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [[[-88.4, 16.5], [-88.3, 16.5], [-88.3, 16.6], [-88.4, 16.6], [-88.4, 16.5]]] },
      properties: { MIMES_ID: 17, NbS_Score: 0.5, Restoration_Potential: 0.36, Conservation_Value: 0.10, Clade_1_pct: 0.6 },
    },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(sampleFC), { headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
});

function renderLayers(site: 'placencia' | 'caye-caulker' | null = 'placencia', encoding: 'nbs' | 'clade' | 'restoration' = 'nbs') {
  const store = createStore();
  store.set(activeSiteAtom, site);
  store.set(marineEncodingAtom, encoding);
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Provider store={store}>
        <MarineMapLayers />
      </Provider>
    </SWRConfig>,
  );
}

describe('REQ-MA-014 — MarineMapLayers', () => {
  it('renders nothing visible — Deck.gl layers are imperative', () => {
    const { container } = renderLayers('placencia', 'nbs');
    expect(container.firstChild).toBeNull();
  });
});

describe('REQ-MA-014 — buildLayerConfigsForSite (pure layer-config builder)', () => {
  // Watershed adjacency layers were dropped post-MA-017 — see the
  // "Deviations from the v1.5 plan" section of the v1.5 design doc.
  it('returns 3 layer configs for placencia (marine, coast, 30poly — all joined-NbS variants)', () => {
    // Per Track G (2026-05-12): the configs point at the JOINED datasets
    // (*-nbs-scores) so encoding properties land in feature.properties.
    // Raw shape datasets carry only geometry + join key.
    const configs = buildLayerConfigsForSite('placencia');
    expect(configs.length).toBe(3);
    expect(configs.map((c) => c.datasetId)).toEqual([
      'placencia-marine-nbs-scores',
      'placencia-coast-nbs-scores',
      'placencia-30polygons-nbs-scores',
    ]);
  });

  it('returns 3 layer configs for caye-caulker', () => {
    const configs = buildLayerConfigsForSite('caye-caulker');
    expect(configs.length).toBe(3);
    expect(configs.map((c) => c.datasetId)).toEqual([
      'cayecaulker-marine-nbs-scores',
      'cayecaulker-coast-nbs-scores',
      'cayecaulker-site',
    ]);
  });

  it('returns no configs for null (Belize-wide)', () => {
    expect(buildLayerConfigsForSite(null)).toEqual([]);
  });

  it('does not include any watershed-polygons family configs', () => {
    const placencia = buildLayerConfigsForSite('placencia');
    const cayeCaulker = buildLayerConfigsForSite('caye-caulker');
    const families = [...placencia, ...cayeCaulker].map((c) => c.family);
    expect(families).not.toContain('watershed-polygons');
  });
});

function renderPicker(
  initial: 'nbs' | 'clade' | 'restoration' | 'biomass' = 'nbs',
  site: 'placencia' | 'caye-caulker' | 'laughing-bird' | null = 'placencia',
) {
  const store = createStore();
  store.set(marineEncodingAtom, initial);
  store.set(activeSiteAtom, site);
  return {
    store,
    ...render(
      <Provider store={store}>
        <EncoderPicker />
      </Provider>,
    ),
  };
}

describe('REQ-MA-014 — EncoderPicker', () => {
  it('renders three segmented pills with the correct active state on a non-Laughing-Bird site', () => {
    renderPicker('nbs', 'placencia');
    const radioGroup = screen.getByRole('radiogroup');
    expect(radioGroup).toBeInTheDocument();
    const nbs = screen.getByRole('radio', { name: /NbS/i });
    expect(nbs).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Clade/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /Restoration/i })).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByRole('radio', { name: /Biomass/i })).not.toBeInTheDocument();
  });

  it('offers the Biomass pill only on laughing-bird', () => {
    renderPicker('biomass', 'laughing-bird');
    expect(screen.getByRole('radio', { name: /Biomass/i })).toBeInTheDocument();
  });

  it('clicking a pill updates marineEncodingAtom', async () => {
    const { store } = renderPicker('nbs', 'placencia');
    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: /Clade/i }));
    expect(store.get(marineEncodingAtom)).toBe('clade');
  });

  it('arrow-right cycles nbs → clade → restoration → nbs on a non-Laughing-Bird site (no Biomass pill)', async () => {
    const { store } = renderPicker('nbs', 'placencia');
    const user = userEvent.setup();
    screen.getByRole('radio', { name: /NbS/i }).focus();
    await user.keyboard('{ArrowRight}');
    expect(store.get(marineEncodingAtom)).toBe('clade');
    await user.keyboard('{ArrowRight}');
    expect(store.get(marineEncodingAtom)).toBe('restoration');
    await user.keyboard('{ArrowRight}');
    expect(store.get(marineEncodingAtom)).toBe('nbs');
  });

  it('arrow-right cycles through all four pills including Biomass on laughing-bird', async () => {
    const { store } = renderPicker('nbs', 'laughing-bird');
    const user = userEvent.setup();
    screen.getByRole('radio', { name: /NbS/i }).focus();
    await user.keyboard('{ArrowRight}');
    expect(store.get(marineEncodingAtom)).toBe('clade');
    await user.keyboard('{ArrowRight}');
    expect(store.get(marineEncodingAtom)).toBe('restoration');
    await user.keyboard('{ArrowRight}');
    expect(store.get(marineEncodingAtom)).toBe('biomass');
    await user.keyboard('{ArrowRight}');
    expect(store.get(marineEncodingAtom)).toBe('nbs');
  });

  it('each pill has a tooltip describing the encoding', () => {
    renderPicker('nbs', 'placencia');
    expect(screen.getByRole('radio', { name: /NbS/i })).toHaveAttribute('title', expect.stringMatching(/Nature-based Solutions/i));
    expect(screen.getByRole('radio', { name: /Clade/i })).toHaveAttribute('title', expect.stringMatching(/dominant ecosystem clade/i));
    expect(screen.getByRole('radio', { name: /Restoration/i })).toHaveAttribute('title', expect.stringMatching(/Restoration Potential/i));
  });
});

function renderLegend(opts: { encoding: 'nbs' | 'clade' | 'restoration'; values?: number[] } = { encoding: 'nbs' }) {
  const store = createStore();
  store.set(marineEncodingAtom, opts.encoding);
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Provider store={store}>
        <MapLegend featureValues={opts.values ?? [0.2, 0.4, 0.6, 0.8]} />
      </Provider>
    </SWRConfig>,
  );
}

describe('REQ-MA-014 — MapLegend', () => {
  it('renders a continuous gradient bar for nbs mode', () => {
    renderLegend({ encoding: 'nbs', values: [0.21, 0.46, 0.71] });
    expect(screen.getByTestId('legend-gradient-bar')).toBeInTheDocument();
  });

  it('renders min and max numeric labels for continuous modes', () => {
    renderLegend({ encoding: 'nbs', values: [0.21, 0.46, 0.71] });
    expect(screen.getByTestId('legend-min')).toHaveTextContent('0.21');
    expect(screen.getByTestId('legend-max')).toHaveTextContent('0.71');
  });

  it('renders adaptive distribution bins in the map legend', () => {
    renderLegend({ encoding: 'nbs', values: [0.21, 0.46, 0.71, 0.4, 0.5, 0.6] });
    expect(screen.getAllByTestId(/^legend-histogram-bin-/)).toHaveLength(4);
    expect(screen.getByText(/Polygons by score · n=6/i)).toBeInTheDocument();
  });

  it('renders categorical clade list for clade mode', () => {
    renderLegend({ encoding: 'clade' });
    expect(screen.getByTestId('legend-clade-list')).toBeInTheDocument();
  });
});
