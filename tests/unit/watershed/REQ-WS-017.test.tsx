import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom, selectedPolygonAtom } from '@/atoms';
import { WatershedDomainContent } from '@/features/watershed/domain/WatershedDomainContent';

vi.mock('@/lib/data', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data')>('@/lib/data');
  return {
    ...actual,
    useWatershedsForSite: () => ({
      geometry: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { Name: 'Big Creek', NbS_Score: 0.62 },
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
          },
        ],
      },
      joinedAttrs: null,
      loading: false,
      error: null,
    }),
  };
});

function renderWith({
  selected,
  reducedMotion = false,
}: {
  selected: { layerId: string; featureId: string | number } | null;
  reducedMotion?: boolean;
}) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  if (selected) store.set(selectedPolygonAtom, selected);

  if (reducedMotion) {
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
  }
  return {
    store,
    ...render(
      <Provider store={store}>
        <WatershedDomainContent />
      </Provider>,
    ),
  };
}

describe('REQ-WS-017: Tier 1↔2 collapse transition', () => {
  beforeEach(() => {
    const original = window.matchMedia;
    window.matchMedia = (query: string) =>
      original
        ? original(query)
        : ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            addListener: () => {},
            removeListener: () => {},
            dispatchEvent: () => false,
          });
  });

  it('shows the full Tier 1 panel when no polygon is selected', () => {
    renderWith({ selected: null });
    expect(screen.getByTestId('watershed-tier-1')).toBeInTheDocument();
    expect(screen.queryByTestId('watershed-tier-1-chip')).toBeNull();
  });

  it('collapses Tier 1 to a chip when a polygon is selected', () => {
    renderWith({ selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' } });
    expect(screen.getByTestId('watershed-tier-1-chip')).toBeInTheDocument();
    expect(screen.queryByTestId('watershed-tier-1')).toBeNull();
    expect(screen.getByTestId('watershed-tier-1-chip')).toHaveTextContent(/Big Creek/);
  });

  it('chip back button clears the selectedPolygon atom', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({
      selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' },
    });
    expect(store.get(selectedPolygonAtom)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: /back to ranking|back|clear/i }));
    expect(store.get(selectedPolygonAtom)).toBeNull();
  });

  it('disables transition class when prefers-reduced-motion is set', () => {
    renderWith({
      selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' },
      reducedMotion: true,
    });
    const chip = screen.getByTestId('watershed-tier-1-chip');
    expect(chip.getAttribute('data-reduced-motion')).toBe('true');
  });
});
