import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import type { ReactNode } from 'react';
import type { Feature, FeatureCollection } from 'geojson';
import { activeSiteAtom, selectedPolygonAtom } from '@/atoms';
import { NbSPriorityPanel } from '@/features/watershed/domain/NbSPriorityPanel';
import { WatershedDomainContent } from '@/features/watershed/domain/WatershedDomainContent';
import { RusleFormulaCard } from '@/features/watershed/domain/RusleFormulaCard';

const polygonRing = (lng: number, lat: number) => [
  [lng, lat],
  [lng + 0.05, lat],
  [lng + 0.05, lat + 0.05],
  [lng, lat + 0.05],
  [lng, lat],
];

function makeFeature(name: string, lng: number, lat: number, extra: Record<string, unknown> = {}): Feature {
  return {
    type: 'Feature',
    properties: { Name: name, MIMES_ID: name, ...extra },
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
  {
    Name: 'Alpha',
    NbS_Score: 0.9,
    Restoration_Potential: 0.8,
    Conservation_Value: 0.7,
    Suitable_Elev_Pct: 60,
  },
  {
    Name: 'Beta',
    NbS_Score: 0.5,
    Restoration_Potential: 0.5,
    Conservation_Value: 0.5,
    Suitable_Elev_Pct: 30,
  },
  {
    Name: 'Gamma',
    NbS_Score: 0.1,
    Restoration_Potential: 0.1,
    Conservation_Value: 0.2,
    Suitable_Elev_Pct: 5,
  },
];

const FIXTURE_RUSLE = [
  {
    Name: 'Alpha',
    mean_r_factor: 3400,
    K_factor: 0.21,
    LS_factor: 1.4,
    C_factor: 0.35,
    P_factor: 1,
  },
];

vi.mock('@/lib/data', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data')>('@/lib/data');
  return {
    ...actual,
    useWatershedsForSite: () => ({
      geometry: FIXTURE_GEOMETRY,
      joinedAttrs: { nbs: FIXTURE_NBS, rusle: FIXTURE_RUSLE, clade: [] },
      loading: false,
      error: null,
    }),
  };
});

vi.mock('@/features/watershed/map/useWatershedEbinCladePerPolygon', () => ({
  useWatershedEbinCladePerPolygon: () => ({ lookup: new Map() }),
}));

function renderWithStore(node: ReactNode, selected: string | null = null) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  if (selected) store.set(selectedPolygonAtom, { layerId: 'watershed-polygons', featureId: selected });
  return {
    store,
    ...render(<Provider store={store}>{node}</Provider>),
  };
}

describe('REQ-WS-045: watershed accessibility and motion pass', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.matchMedia = (query: string) => ({
      matches: /reduce/.test(query),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('moves through the NbS rank list with arrow keys and selects with Enter', async () => {
    const user = userEvent.setup();
    const { store } = renderWithStore(<NbSPriorityPanel />);
    const first = screen.getByRole('button', { name: /Rank 1: Alpha/i });
    const second = screen.getByRole('button', { name: /Rank 2: Beta/i });

    first.focus();
    await user.keyboard('{ArrowDown}');
    expect(second).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(store.get(selectedPolygonAtom)).toEqual({
      layerId: 'watershed-polygons',
      featureId: 'Beta',
    });
  });

  it('manages focus when Tier 1 collapses to detail and returns to ranking', async () => {
    const user = userEvent.setup();
    renderWithStore(<WatershedDomainContent />);

    await user.click(screen.getByRole('button', { name: /Rank 1: Alpha/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Back to ranking/i })).toHaveFocus());

    await user.click(screen.getByRole('button', { name: /Back to ranking/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Rank 1: Alpha/i })).toHaveFocus());
  });

  it('exposes reduced-motion state on the Tier 1 chip', () => {
    renderWithStore(<WatershedDomainContent />, 'Alpha');
    expect(screen.getByTestId('watershed-tier-1-chip')).toHaveAttribute(
      'data-reduced-motion',
      'true',
    );
  });

  it('labels formula tooltips and RUSLE factor summaries for screen readers', () => {
    renderWithStore(<RusleFormulaCard />, 'Alpha');
    expect(screen.getByRole('button', { name: /Show formula for RUSLE soil loss/i })).toHaveAttribute(
      'aria-controls',
    );
    expect(screen.getByLabelText(/R: Rainfall erosivity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/K: Soil erodibility/i)).toBeInTheDocument();
  });
});
