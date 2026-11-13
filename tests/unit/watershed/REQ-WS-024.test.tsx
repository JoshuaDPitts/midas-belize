import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import type { Feature, FeatureCollection } from 'geojson';
import {
  activeSiteAtom,
  nbsRankWeightsAtom,
  selectedPolygonAtom,
  swipeWatershedAtom,
} from '@/atoms';
import { NbSPriorityPanel } from '@/features/watershed/domain/NbSPriorityPanel';

const polygonRing = (lng: number, lat: number) => [
  [lng, lat],
  [lng + 0.05, lat],
  [lng + 0.05, lat + 0.05],
  [lng, lat + 0.05],
  [lng, lat],
];

function makeFeature(
  name: string,
  lng: number,
  lat: number,
  extra: Record<string, unknown> = {},
): Feature {
  return {
    type: 'Feature',
    properties: {
      Name: name,
      MIMES_ID: name.charCodeAt(0),
      ...extra,
    },
    geometry: { type: 'Polygon', coordinates: [polygonRing(lng, lat)] },
  };
}

const FIXTURE_GEOMETRY: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    makeFeature('Alpha', -88.5, 16.4),
    makeFeature('Beta', -88.4, 16.4),
    makeFeature('Gamma', -88.3, 16.4),
  ],
};

const FIXTURE_NBS = [
  { Name: 'Alpha', NbS_Score: 0.9, Restoration_Potential: 0.8, Conservation_Value: 0.7, Suitable_Elev_Pct: 60, Mangrove_Pct_Total: 10 },
  { Name: 'Beta', NbS_Score: 0.5, Restoration_Potential: 0.5, Conservation_Value: 0.5, Suitable_Elev_Pct: 30, Mangrove_Pct_Total: 50 },
  { Name: 'Gamma', NbS_Score: 0.1, Restoration_Potential: 0.1, Conservation_Value: 0.2, Suitable_Elev_Pct: 5, Mangrove_Pct_Total: 90 },
];

vi.mock('@/lib/data', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data')>('@/lib/data');
  return {
    ...actual,
    useWatershedsForSite: () => ({
      geometry: FIXTURE_GEOMETRY,
      joinedAttrs: { nbs: FIXTURE_NBS, clade: [], rusle: [] },
      loading: false,
      error: null,
    }),
  };
});

vi.mock('@/features/watershed/map/useWatershedEbinCladePerPolygon', () => ({
  useWatershedEbinCladePerPolygon: () => ({ lookup: new Map() }),
}));

function renderPanel(opts: { weights?: Record<string, number> } = {}) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  if (opts.weights) store.set(nbsRankWeightsAtom, opts.weights);
  return {
    store,
    ...render(
      <Provider store={store}>
        <NbSPriorityPanel />
      </Provider>,
    ),
  };
}

describe('REQ-WS-024: NbSPriorityPanel', () => {
  it('renders the three-tile summary header', () => {
    renderPanel();
    expect(screen.getByText(/Restorable area/i)).toBeInTheDocument();
    expect(screen.getByText(/Mean conservation/i)).toBeInTheDocument();
    expect(screen.getByText(/High-ROI watersheds/i)).toBeInTheDocument();
  });

  it('renders one rank row per polygon, sorted by composite score descending', () => {
    renderPanel();
    const list = screen.getByTestId('nbs-rank-list');
    const rows = list.querySelectorAll('li');
    expect(rows).toHaveLength(3);
    // Alpha has the highest restoration + conservation, so it should rank first.
    expect(rows[0].textContent).toContain('Alpha');
    expect(rows[2].textContent).toContain('Gamma');
  });

  it('toggling Customise ranking reveals one slider per registered factor', async () => {
    const user = userEvent.setup();
    renderPanel();
    expect(screen.queryByTestId('nbs-slider-restoration-potential')).toBeNull();
    await user.click(screen.getByRole('button', { name: /Customise ranking/i }));
    expect(screen.getByTestId('nbs-slider-restoration-potential')).toBeInTheDocument();
    expect(screen.getByTestId('nbs-slider-conservation-value')).toBeInTheDocument();
    expect(screen.getByTestId('nbs-slider-area')).toBeInTheDocument();
  });

  it('moving a slider updates nbsRankWeightsAtom', async () => {
    const user = userEvent.setup();
    const { store } = renderPanel();
    await user.click(screen.getByRole('button', { name: /Customise ranking/i }));
    const slider = screen.getByTestId('nbs-slider-restoration-potential');
    // fireEvent.change is the canonical way to drive a range input in
    // testing-library; userEvent.type doesn't work for input[type=range]
    // and raw dispatchEvent doesn't surface through React's onChange.
    fireEvent.change(slider, { target: { value: '1.7' } });
    expect(store.get(nbsRankWeightsAtom)['restoration-potential']).toBeCloseTo(1.7, 5);
  });

  it('selecting a preset atomically sets the weight vector', async () => {
    const user = userEvent.setup();
    const { store } = renderPanel();
    const select = screen.getByTestId('nbs-preset-select') as HTMLSelectElement;
    await user.selectOptions(select, 'coral-protection');
    const weights = store.get(nbsRankWeightsAtom);
    // The Coral protection preset weights r-factor at 1.2 and
    // downstream-sediment at 1.5 — assert both came through atomically.
    expect(weights['r-factor']).toBe(1.2);
    expect(weights['downstream-sediment']).toBe(1.5);
  });

  it('clicking a rank row dispatches selectedPolygonAtom', async () => {
    const user = userEvent.setup();
    const { store } = renderPanel();
    const firstRow = screen.getByTestId('nbs-rank-row-1');
    const button = firstRow.querySelector('button')!;
    await user.click(button);
    expect(store.get(selectedPolygonAtom)).toEqual({
      layerId: 'watershed-polygons',
      featureId: 'Alpha',
    });
  });

  it('Compare top 2 sets swipeWatershedAtom with rank-1 and rank-2 ids', async () => {
    const user = userEvent.setup();
    const { store } = renderPanel();
    await user.click(screen.getByTestId('nbs-compare-top-two'));
    const swipe = store.get(swipeWatershedAtom);
    expect(swipe.left).toBe('Alpha');
    expect(swipe.right).toBe('Beta');
  });
});
