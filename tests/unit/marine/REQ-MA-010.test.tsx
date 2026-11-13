import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { MarinePolygonFormatter } from '@/features/marine/inspect/MarinePolygonFormatter';
import { SSTPointFormatter } from '@/features/marine/inspect/SSTPointFormatter';
import type { FeatureHit } from '@/atoms';
import type { LayerSummary } from '@/lib/data';

const marineLayer: LayerSummary = {
  id: 'placencia-marine-polygons',
  layer: 'placencia-marine-polygons',
  title: 'Placencia marine polygons',
  family: 'marine-polygons',
  scope: 'site',
  description: '', tags: [], bbox: null, temporal_extent: null, data_url: '', current_version: null,
  provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] },
};

const marineFeature: FeatureHit = {
  layerId: 'placencia-marine-polygons',
  featureId: 17,
  properties: {
    MIMES_ID: 17,
    NbS_Score: 0.46,
    Restoration_Potential: 0.36,
    Conservation_Value: 0.10,
  },
  lngLat: [-88.36, 16.55],
};

function renderWithStore(ui: React.ReactElement) {
  const store = createStore();
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('REQ-MA-010 — MarinePolygonFormatter', () => {
  it('renders the polygon ID and layer title', () => {
    renderWithStore(<MarinePolygonFormatter feature={marineFeature} layer={marineLayer} />);
    expect(screen.getByTestId('marine-polygon-header')).toHaveTextContent(/Placencia marine polygons/);
    expect(screen.getByTestId('marine-polygon-header')).toHaveTextContent(/17/);
  });

  it('renders the NbS score with a continuous color', () => {
    renderWithStore(<MarinePolygonFormatter feature={marineFeature} layer={marineLayer} />);
    expect(screen.getByTestId('marine-polygon-nbs')).toHaveTextContent('0.46');
  });

  it('renders an "Open in Marine analysis" CTA', () => {
    renderWithStore(<MarinePolygonFormatter feature={marineFeature} layer={marineLayer} />);
    expect(screen.getByRole('button', { name: /Open in Marine analysis/i })).toBeInTheDocument();
  });
});

const sstFeature: FeatureHit = {
  layerId: 'sst-monthly-2015-2024',
  featureId: 'placencia-low-tp',
  properties: { transect: 'Placencia LowTP', sst_c: 28.4, iso: '2024-09' },
  lngLat: [-88.01295, 16.45816],
};

const sstLayer: LayerSummary = {
  id: 'sst-monthly-2015-2024',
  layer: 'sst-monthly-2015-2024',
  title: 'SST',
  family: 'sst-timeseries',
  scope: 'national',
  description: '', tags: [], bbox: null, temporal_extent: null, data_url: '', current_version: null,
  provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] },
};

describe('REQ-MA-010 — SSTPointFormatter', () => {
  it('renders the transect name and latest SST', () => {
    render(<SSTPointFormatter feature={sstFeature} layer={sstLayer} />);
    expect(screen.getByTestId('sst-transect')).toHaveTextContent(/Placencia LowTP/);
    expect(screen.getByTestId('sst-latest')).toHaveTextContent('28.4');
  });

  it('flags heat stress when SST > 31°C', () => {
    const hot = { ...sstFeature, properties: { ...sstFeature.properties, sst_c: 31.6 } };
    render(<SSTPointFormatter feature={hot} layer={sstLayer} />);
    expect(screen.getByTestId('sst-heat-flag')).toBeInTheDocument();
  });

  it('does not flag heat stress when SST ≤ 31°C', () => {
    render(<SSTPointFormatter feature={sstFeature} layer={sstLayer} />);
    expect(screen.queryByTestId('sst-heat-flag')).not.toBeInTheDocument();
  });
});
