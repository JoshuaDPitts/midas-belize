/**
 * REQ-CO-011: CoastalPolygonFormatter — inspect card
 *
 * Tests:
 * 1. Renders polygon name, vulnerability score, urban ratio bar, mangrove coverage bar
 * 2. Empty state when no data is joined (properties has minimal info)
 * 3. "Open in Coastal analysis" CTA dispatches selectedPolygonAtom + sidebarPanelAtom = 'domain'
 * 4. Shows N/A or "--" for missing numeric values
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { selectedPolygonAtom, sidebarPanelAtom, type FeatureHit } from '@/atoms';
import type { LayerSummary } from '@/lib/data';
import { CoastalPolygonFormatter } from '@/features/coastal/inspect/CoastalPolygonFormatter';
import type { InspectFormatterProps } from '@/features/_types';

function makeFeature(props: Record<string, unknown>): FeatureHit {
  return {
    layerId: 'coastal-polygon-layer',
    featureId: (props.Name ?? props.MIMES_ID ?? props.id ?? 'test-polygon') as string | number,
    properties: props,
    lngLat: [-88.2, 16.5],
  };
}

const LAYER: LayerSummary = {
  id: 'coastal-polygon-layer',
  layer: 'coastal-polygon-layer',
  title: 'Coastal Polygons',
  description: '',
  family: 'coastal-polygons',
  scope: 'site',
  tags: [],
  bbox: null,
  temporal_extent: null,
  data_url: '',
  current_version: null,
  provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] },
};

function renderWith(props: Record<string, unknown>) {
  const store = createStore();
  const formatterProps: InspectFormatterProps = {
    feature: makeFeature(props),
    layer: LAYER,
  };
  return {
    store,
    ...render(
      <Provider store={store}>
        <CoastalPolygonFormatter {...formatterProps} />
      </Provider>,
    ),
  };
}

// ---------------------------------------------------------------------------
// 1. Renders polygon name, vulnerability score, urban ratio bar, mangrove bar
// ---------------------------------------------------------------------------
describe('REQ-CO-011: CoastalPolygonFormatter renders data', () => {
  it('renders the polygon name', () => {
    renderWith({
      Name: 'Placencia South',
      perc_urban: 40,
      Mangrove_Pct_Total: 20,
    });
    expect(screen.getByTestId('coastal-polygon-formatter')).toHaveTextContent('Placencia South');
  });

  it('renders vulnerability score', () => {
    renderWith({
      Name: 'Placencia South',
      perc_urban: 40,  // 0.4 urban ratio
      Mangrove_Pct_Total: 20, // 0.2 mangrove coverage
      // V = 0.4 * (1 - 0.2) = 0.32
    });
    expect(screen.getByTestId('coastal-vulnerability-score')).toBeInTheDocument();
    // 0.32 formatted to 2 decimals
    expect(screen.getByTestId('coastal-vulnerability-score')).toHaveTextContent('0.32');
  });

  it('renders urban ratio bar', () => {
    renderWith({
      Name: 'Placencia South',
      perc_urban: 40,
      Mangrove_Pct_Total: 20,
    });
    expect(screen.getByTestId('coastal-bar-urban')).toBeInTheDocument();
  });

  it('renders mangrove coverage bar', () => {
    renderWith({
      Name: 'Placencia South',
      perc_urban: 40,
      Mangrove_Pct_Total: 20,
    });
    expect(screen.getByTestId('coastal-bar-mangrove')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Empty state when no data joined
// ---------------------------------------------------------------------------
describe('REQ-CO-011: CoastalPolygonFormatter empty state', () => {
  it('renders empty state when no urban or mangrove data present', () => {
    renderWith({ Name: 'Bare Polygon' });
    expect(screen.getByTestId('coastal-polygon-empty')).toBeInTheDocument();
  });

  it('does not render vulnerability score in empty state', () => {
    renderWith({ Name: 'Bare Polygon' });
    expect(screen.queryByTestId('coastal-vulnerability-score')).toBeNull();
  });

  it('does not render urban bar in empty state', () => {
    renderWith({ Name: 'Bare Polygon' });
    expect(screen.queryByTestId('coastal-bar-urban')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. CTA dispatches selectedPolygonAtom + sidebarPanelAtom = 'domain'
// ---------------------------------------------------------------------------
describe('REQ-CO-011: CoastalPolygonFormatter CTA', () => {
  it('CTA click sets sidebarPanelAtom to domain', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({
      Name: 'Placencia South',
      perc_urban: 40,
      Mangrove_Pct_Total: 20,
    });
    await user.click(screen.getByRole('button', { name: /Coastal analysis/i }));
    expect(store.get(sidebarPanelAtom)).toBe('domain');
  });

  it('CTA click sets selectedPolygonAtom with layerId and featureId', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({
      Name: 'Placencia South',
      perc_urban: 40,
      Mangrove_Pct_Total: 20,
    });
    await user.click(screen.getByRole('button', { name: /Coastal analysis/i }));
    expect(store.get(selectedPolygonAtom)).toEqual({
      layerId: 'coastal-polygon-layer',
      featureId: 'Placencia South',
    });
  });

  it('CTA click still sets panel even when no polygon id', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({});
    await user.click(screen.getByRole('button', { name: /Coastal analysis/i }));
    expect(store.get(sidebarPanelAtom)).toBe('domain');
  });
});

// ---------------------------------------------------------------------------
// 4. Shows "--" for missing numeric values
// ---------------------------------------------------------------------------
describe('REQ-CO-011: CoastalPolygonFormatter missing values', () => {
  it('falls back to MIMES_ID when Name absent', () => {
    renderWith({ MIMES_ID: 'C-007', perc_urban: 30, Mangrove_Pct_Total: 10 });
    expect(screen.getByTestId('coastal-polygon-formatter')).toHaveTextContent('C-007');
  });

  it('falls back to id when Name and MIMES_ID absent', () => {
    renderWith({ id: 'poly-42', perc_urban: 30, Mangrove_Pct_Total: 10 });
    expect(screen.getByTestId('coastal-polygon-formatter')).toHaveTextContent('poly-42');
  });

  it('falls back to generic "Polygon" when no id fields present', () => {
    renderWith({ perc_urban: 30, Mangrove_Pct_Total: 10 });
    expect(screen.getByTestId('coastal-polygon-formatter')).toHaveTextContent('Polygon');
  });

  it('shows mangrove bar but not urban bar when only mangrove data present', () => {
    renderWith({ Name: 'Test', Mangrove_Pct_Total: 20 });
    // Mangrove data is present → not empty, urban bar absent, mangrove bar shown
    expect(screen.queryByTestId('coastal-polygon-empty')).toBeNull();
    expect(screen.queryByTestId('coastal-bar-urban')).toBeNull();
    expect(screen.getByTestId('coastal-bar-mangrove')).toBeInTheDocument();
  });

  it('handles ratio_urban field (0-1 scale) correctly', () => {
    renderWith({ Name: 'Test', ratio_urban: 0.4, Mangrove_Pct_Total: 20 });
    expect(screen.getByTestId('coastal-bar-urban')).toBeInTheDocument();
    expect(screen.getByTestId('coastal-vulnerability-score')).toHaveTextContent('0.32');
  });
});
