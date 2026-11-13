import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom, inspectedFeatureAtom, selectedPolygonAtom, type FeatureHit } from '@/atoms';
import { MarineDomainContent } from '@/features/marine/domain/MarineDomainContent';
import { SWRConfig } from 'swr';

// ---------------------------------------------------------------------------
// Fixtures
// - EBIN_FIXTURE: ebin-clade-detail row for polygon 17 (used by useMarineDataForPolygon).
// - FOODWEB_*: real foodweb-* dataset shapes used by useFoodwebData(). 2-guild
//   minimal fixture (Phytoplankton + Zooplankton with one prey edge) so we can
//   assert against deterministic node ids without depending on the prod catalog.
// ---------------------------------------------------------------------------
const EBIN_FIXTURE = [
  {
    Polygon_ID: 17,
    BIN_ID: 1,
    BIN_Label: '-30 to -20m',
    Clade_1_pct: 0.4,
    Clade_2_pct: 0.3,
    Clade_3_pct: 0,
  },
];

const FOODWEB_ATTRS = {
  dataset_id: 'foodweb-guild-attributes-16',
  row_count: 2,
  columns: ['ID Number', 'Common Name'],
  rows: [
    { 'ID Number': 1, 'Common Name': 'Phytoplankton', 'Category': 'Primary Producers' },
    { 'ID Number': 4, 'Common Name': 'Zooplankton', 'Category': 'Primary Consumers' },
  ],
};

const FOODWEB_PRED_PREY = {
  dataset_id: 'foodweb-pred-prey-16',
  row_count: 1,
  columns: ['Predator ID', 'Prey ID'],
  rows: [
    { 'Predator ID': 4, 'Predator Guild': 'Zooplankton', 'Prey ID': 1, 'Prey Guild': 'Phytoplankton' },
  ],
};

const FOODWEB_DEPTH_IC = {
  dataset_id: 'foodweb-guild-depth-ic-biomass',
  row_count: 2,
  columns: ['Guild_ID', 'IC_Biomass'],
  rows: [
    { 'Guild_ID': 1, 'IC_Biomass': 0.5 },
    { 'Guild_ID': 4, 'IC_Biomass': 0.2 },
  ],
};

function setup(feature: FeatureHit | null) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  store.set(inspectedFeatureAtom, feature);
  // MA-016: focused mode is now gated on selectedPolygonAtom. Set both atoms so
  // the MarineHeroPanel renders focused content and v1 components get feature data.
  if (feature) {
    store.set(selectedPolygonAtom, { layerId: feature.layerId, featureId: feature.featureId });
  }

  // Mock fetch — route by URL substring:
  // - ebin-clade-detail → EBIN_FIXTURE (raw array; csv-polygon-join converter shape)
  // - foodweb-guild-attributes → FOODWEB_ATTRS (CsvRows wrapper from csv converter)
  // - foodweb-pred-prey → FOODWEB_PRED_PREY
  // - foodweb-guild-depth-ic-biomass → FOODWEB_DEPTH_IC
  // - anything else → empty
  global.fetch = vi.fn(async (input: string | URL | Request) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
    let body: unknown = [];
    if (url.includes('ebin-clade-detail')) body = EBIN_FIXTURE;
    else if (url.includes('foodweb-guild-attributes')) body = FOODWEB_ATTRS;
    else if (url.includes('foodweb-pred-prey')) body = FOODWEB_PRED_PREY;
    else if (url.includes('foodweb-guild-depth-ic-biomass')) body = FOODWEB_DEPTH_IC;
    return new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  }) as typeof fetch;

  return render(
    // SWRConfig with an isolated per-test cache prevents cross-test cache pollution.
    <SWRConfig value={{ provider: () => new Map() }}>
      <Provider store={store}>
        <MarineDomainContent />
      </Provider>
    </SWRConfig>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('REQ-MA-009 — Cross-component interactions + data wiring', () => {
  it('clicking a FoodWebDiagram node toggles its highlight via context', async () => {
    setup({
      layerId: 'placencia-marine-polygons',
      featureId: 17,
      properties: {
        MIMES_ID: 17,
        NbS_Score: 0.46,
        Restoration_Potential: 0.36,
        Conservation_Value: 0.10,
      },
      lngLat: [-88.36, 16.55],
    });
    const user = userEvent.setup();

    // After SWR resolves the 3 foodweb-* fetches, FoodWebDiagram renders nodes
    // for the 2 fixture guilds (Phytoplankton id=1, Zooplankton id=4). Wait for
    // the node corresponding to guild ID "1" to appear.
    const getPhyto = () => screen.getByTestId('foodweb-node-1');
    await waitFor(() => getPhyto());

    // Initially no highlight.
    expect(getPhyto()).toHaveAttribute('data-highlighted', 'false');

    // First click — highlights the node.
    await user.click(getPhyto());
    expect(getPhyto()).toHaveAttribute('data-highlighted', 'true');

    // Second click on same node — toggles off (same id → null).
    await user.click(getPhyto());
    expect(getPhyto()).toHaveAttribute('data-highlighted', 'false');
  });

  it('NbSScoreCard reads NbS_Score from inspectedFeatureAtom', async () => {
    setup({
      layerId: 'placencia-marine-polygons',
      featureId: 17,
      properties: {
        MIMES_ID: 17,
        NbS_Score: 0.46,
        Restoration_Potential: 0.36,
        Conservation_Value: 0.10,
      },
      lngLat: [-88.36, 16.55],
    });
    // nbs-headline is rendered by NbSScoreCard and displays the score to 2dp.
    expect(await screen.findByTestId('nbs-headline')).toHaveTextContent('0.46');
  });

  it('renders the real foodweb graph regardless of which polygon is selected', async () => {
    // The foodweb-* datasets are site-AGNOSTIC (national MIMES model spec) —
    // they always provide the same 16-guild graph regardless of which polygon
    // is focused. So a polygon that has no ebin-clade match should still get
    // the full foodweb diagram from the real datasets, never synthetic fallback.
    setup({
      layerId: 'placencia-marine-polygons',
      featureId: 99,
      properties: {
        MIMES_ID: 99,
        NbS_Score: 0.3,
        Restoration_Potential: 0.2,
        Conservation_Value: 0.1,
      },
      lngLat: [-88.36, 16.55],
    });
    // The fixture provides 2 guilds (Phytoplankton id=1, Zooplankton id=4).
    expect(await screen.findByTestId('foodweb-node-1')).toBeInTheDocument();
    expect(await screen.findByTestId('foodweb-node-4')).toBeInTheDocument();
    // Critical: no synthetic placeholder ids must appear (e.g. 'phytoplankton'
    // as a lowercased slug — those were the old fallback ids).
    expect(screen.queryByTestId('foodweb-node-phytoplankton')).not.toBeInTheDocument();
  });
});
