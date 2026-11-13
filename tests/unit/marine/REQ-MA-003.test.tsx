import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { SWRConfig } from 'swr';
import { activeSiteAtom } from '@/atoms';
import { MarineLayerGroups } from '@/features/marine/layers/MarineLayerGroups';

const layersFixture = {
  layers: [
    { id: 'placencia-marine-polygons', layer: 'placencia-marine-polygons', title: 'Placencia marine polygons', family: 'marine-polygons', scope: 'site', description: '', tags: [], bbox: null, temporal_extent: null, data_url: '', current_version: null, provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] } },
    { id: 'placencia-coast-polygons', layer: 'placencia-coast-polygons', title: 'Placencia coast polygons', family: 'coast-polygons', scope: 'site', description: '', tags: [], bbox: null, temporal_extent: null, data_url: '', current_version: null, provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] } },
    { id: 'placencia-marine-nbs-scores', layer: 'placencia-marine-nbs-scores', title: 'Marine NbS scores', family: 'mimes-nbs-scores', scope: 'site', description: '', tags: [], bbox: null, temporal_extent: null, data_url: '', current_version: null, provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] } },
    { id: 'cayecaulker-marine-polygons', layer: 'cayecaulker-marine-polygons', title: 'Caye Caulker marine polygons', family: 'marine-polygons', scope: 'site', description: '', tags: [], bbox: null, temporal_extent: null, data_url: '', current_version: null, provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] } },
    { id: 'sst-monthly-2015-2024', layer: 'sst-monthly-2015-2024', title: 'SST', family: 'sst-timeseries', scope: 'national', description: '', tags: [], bbox: null, temporal_extent: null, data_url: '', current_version: null, provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] } },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn(async () =>
    new Response(JSON.stringify(layersFixture), { headers: { 'Content-Type': 'application/json' } }),
  ) as typeof fetch;
});

function renderGroups(site: 'placencia' | 'caye-caulker' | null) {
  const store = createStore();
  store.set(activeSiteAtom, site);
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Provider store={store}>
        <MarineLayerGroups />
      </Provider>
    </SWRConfig>,
  );
}

describe('REQ-MA-003 — MarineLayerGroups', () => {
  it('shows "Marine model — Placencia" group when activeSite is placencia', async () => {
    renderGroups('placencia');
    expect(await screen.findByTestId('marine-layers-group')).toHaveTextContent(/Marine model — Placencia/);
  });

  it('lists Placencia marine + coast layers but not Caye Caulker layers', async () => {
    renderGroups('placencia');
    expect(await screen.findByText('Placencia marine polygons')).toBeInTheDocument();
    expect(screen.getByText('Placencia coast polygons')).toBeInTheDocument();
    expect(screen.queryByText('Caye Caulker marine polygons')).not.toBeInTheDocument();
  });

  it('switches to Caye Caulker layers when activeSite changes', async () => {
    renderGroups('caye-caulker');
    expect(await screen.findByTestId('marine-layers-group')).toHaveTextContent(/Caye Caulker/);
    expect(screen.getByText('Caye Caulker marine polygons')).toBeInTheDocument();
  });

  it('returns null (no render) when activeSite is null since hook fetches no layers', async () => {
    renderGroups(null);
    // When site is null, useLayersForSite returns empty layers, so component returns null
    expect(screen.queryByTestId('marine-layers-group')).not.toBeInTheDocument();
  });
});
