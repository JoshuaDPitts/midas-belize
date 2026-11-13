import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import type { Feature, FeatureCollection } from 'geojson';
import {
  activeSiteAtom,
  selectedPolygonAtom,
  swipeWatershedAtom,
} from '@/atoms';
import { WatershedHeroCard } from '@/features/watershed/domain/WatershedHeroCard';

const bigCreek: Feature = {
  type: 'Feature',
  properties: {
    Name: 'Big Creek',
    MIMES_ID: 12,
    NbS_Score: 0.62,
    Conservation_Value: 0.71,
    Restoration_Potential: 0.55,
  },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-88.4, 16.5],
        [-88.3, 16.5],
        [-88.3, 16.6],
        [-88.4, 16.6],
        [-88.4, 16.5],
      ],
    ],
  },
};

const fixture: FeatureCollection = {
  type: 'FeatureCollection',
  features: [bigCreek],
};

vi.mock('@/lib/data', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data')>('@/lib/data');
  return {
    ...actual,
    useWatershedsForSite: () => ({
      geometry: fixture,
      joinedAttrs: null,
      loading: false,
      error: null,
    }),
  };
});

function renderHero({
  selected = null,
  site = 'placencia',
}: {
  selected?: { layerId: string; featureId: string | number } | null;
  site?: 'placencia' | 'caye-caulker' | 'laughing-bird' | null;
} = {}) {
  const store = createStore();
  store.set(activeSiteAtom, site as never);
  if (selected) store.set(selectedPolygonAtom, selected);
  return {
    store,
    ...render(
      <Provider store={store}>
        <WatershedHeroCard />
      </Provider>,
    ),
  };
}

describe('REQ-WS-013: WatershedHeroCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no polygon is selected', () => {
    const { container } = renderHero();
    expect(container.firstChild).toBeNull();
  });

  it('renders the selected polygon name and MIMES_ID', () => {
    renderHero({
      selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' },
    });
    expect(screen.getByTestId('watershed-hero-card')).toHaveTextContent('Big Creek');
    expect(screen.getByTestId('watershed-hero-card')).toHaveTextContent(/MIMES_ID|#12|12/);
  });

  it('renders the WatershedThumbnail SVG in the hero header', () => {
    const { container } = renderHero({
      selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' },
    });
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it('renders the 3 action pills (compare, scenarios, formula)', () => {
    renderHero({
      selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' },
    });
    expect(screen.getByRole('button', { name: /compare/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scenarios/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /formula/i })).toBeInTheDocument();
  });

  it('renders the NbS score formatted to 2 decimals and dual bars', () => {
    renderHero({
      selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' },
    });
    expect(screen.getByTestId('watershed-hero-nbs')).toHaveTextContent('0.62');
    expect(screen.getByTestId('watershed-hero-bar-conservation')).toBeInTheDocument();
    expect(screen.getByTestId('watershed-hero-bar-restoration')).toBeInTheDocument();
  });

  it('clicking "Compare to…" populates swipeWatershedAtom.left with the feature id', async () => {
    const user = userEvent.setup();
    const { store } = renderHero({
      selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' },
    });
    await user.click(screen.getByRole('button', { name: /compare/i }));
    expect(store.get(swipeWatershedAtom).left).toBe('Big Creek');
  });

  it('clicking "Show formula" scrolls to #watershed-rusle-card', async () => {
    const scrollSpy = vi.fn();
    const target = document.createElement('div');
    target.id = 'watershed-rusle-card';
    target.scrollIntoView = scrollSpy;
    document.body.appendChild(target);
    try {
      const user = userEvent.setup();
      renderHero({
        selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' },
      });
      await user.click(screen.getByRole('button', { name: /formula/i }));
      expect(scrollSpy).toHaveBeenCalled();
    } finally {
      target.remove();
    }
  });

  it('renders nothing when the selected polygon id is not found in the site collection', () => {
    const { container } = renderHero({
      selected: { layerId: 'watershed-polygons', featureId: 'Unknown Creek' },
    });
    expect(container.firstChild).toBeNull();
  });
});
