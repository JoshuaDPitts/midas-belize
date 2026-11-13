import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { selectedPolygonAtom, sidebarPanelAtom, type FeatureHit } from '@/atoms';
import type { LayerSummary } from '@/lib/data';
import { WatershedPolygonFormatter } from '@/features/watershed/inspect/WatershedPolygonFormatter';
import type { InspectFormatterProps } from '@/features/_types';

function makeFeature(props: Record<string, unknown>): FeatureHit {
  return {
    layerId: 'placencia-watershed-polygons',
    featureId: (props.Name ?? props.WATERSHED ?? props.MIMES_ID ?? '?') as string | number,
    properties: props,
    lngLat: [-88.35, 16.55],
  };
}

const LAYER: LayerSummary = {
  id: 'placencia-watershed-polygons',
  layer: 'placencia-watershed-polygons',
  title: 'Placencia Watersheds',
  description: '',
  family: 'watershed-polygons',
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
        <WatershedPolygonFormatter {...formatterProps} />
      </Provider>,
    ),
  };
}

describe('REQ-WS-011: WatershedPolygonFormatter', () => {
  it('renders Name when present', () => {
    renderWith({ Name: 'Big Creek', NbS_Score: 0.62 });
    expect(screen.getByTestId('watershed-polygon-formatter')).toHaveTextContent('Big Creek');
  });

  it('falls back to WATERSHED when Name absent', () => {
    renderWith({ WATERSHED: 'Sennis', NbS_Score: 0.4 });
    expect(screen.getByTestId('watershed-polygon-formatter')).toHaveTextContent('Sennis');
  });

  it('falls back to MIMES_ID when Name and WATERSHED absent', () => {
    renderWith({ MIMES_ID: 7, NbS_Score: 0.3 });
    expect(screen.getByTestId('watershed-polygon-formatter')).toHaveTextContent('7');
  });

  it('formats NbS Score to 2 decimals', () => {
    renderWith({ Name: 'Big Creek', NbS_Score: 0.6234 });
    expect(screen.getByTestId('watershed-nbs-value')).toHaveTextContent('0.62');
  });

  it('renders Conservation + Restoration dual bars when present', () => {
    renderWith({
      Name: 'Big Creek',
      NbS_Score: 0.5,
      Conservation_Value: 0.71,
      Restoration_Potential: 0.55,
    });
    expect(screen.getByTestId('watershed-bar-conservation')).toBeInTheDocument();
    expect(screen.getByTestId('watershed-bar-restoration')).toBeInTheDocument();
  });

  it('CTA flips sidebar to domain panel and selects the polygon', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({ Name: 'Big Creek', NbS_Score: 0.5 });
    await user.click(screen.getByRole('button', { name: /Watershed analysis/i }));
    expect(store.get(sidebarPanelAtom)).toBe('domain');
    expect(store.get(selectedPolygonAtom)).toEqual({
      layerId: 'placencia-watershed-polygons',
      featureId: 'Big Creek',
    });
  });

  it('renders empty state when no NbS data joined yet', () => {
    renderWith({ Name: 'Empty Watershed' });
    expect(screen.getByTestId('watershed-polygon-empty')).toBeInTheDocument();
    expect(screen.queryByTestId('watershed-nbs-value')).toBeNull();
  });
});
