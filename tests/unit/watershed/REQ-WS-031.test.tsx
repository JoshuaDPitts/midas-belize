import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import {
  activeSiteAtom,
  swipeWatershedAtom,
} from '@/atoms';
import { WatershedSwipe } from '@/features/watershed/map/WatershedSwipe';

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
            properties: { Name: 'Big Creek' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[-88.4, 16.5], [-88.3, 16.5], [-88.3, 16.6], [-88.4, 16.6], [-88.4, 16.5]]],
            },
          },
          {
            type: 'Feature',
            properties: { Name: 'Sennis' },
            geometry: {
              type: 'Polygon',
              coordinates: [[[-88.3, 16.4], [-88.2, 16.4], [-88.2, 16.5], [-88.3, 16.5], [-88.3, 16.4]]],
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

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});

function renderWith(opts: {
  swipe?: { left: string | number | null; right: string | number | null };
} = {}) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  if (opts.swipe) store.set(swipeWatershedAtom, opts.swipe);
  return {
    store,
    ...render(
      <Provider store={store}>
        <WatershedSwipe />
      </Provider>,
    ),
  };
}

describe('REQ-WS-031: WatershedSwipe (compare controls)', () => {
  it('renders nothing when both swipe slots are null (default)', () => {
    const { container } = renderWith();
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('watershed-swipe-root')).toBeNull();
  });

  it('renders the compare panel with dropdowns once a swipe slot is populated', () => {
    renderWith({ swipe: { left: 'Big Creek', right: null } });
    expect(screen.getByTestId('watershed-swipe-root')).toBeInTheDocument();
    expect(screen.getByTestId('watershed-swipe-left-select')).toBeInTheDocument();
    expect(screen.getByTestId('watershed-swipe-right-select')).toBeInTheDocument();
    expect(screen.getByText(/Compare watersheds/i)).toBeInTheDocument();
  });

  it('primary/compare selects show watershed options from the active site', () => {
    renderWith({ swipe: { left: 'Big Creek', right: null } });
    const left = screen.getByTestId('watershed-swipe-left-select') as HTMLSelectElement;
    const optionLabels = Array.from(left.options).map((o) => o.label);
    expect(optionLabels).toContain('Big Creek');
    expect(optionLabels).toContain('Sennis');
  });

  it('changing the primary dropdown updates swipeWatershedAtom.left', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({ swipe: { left: 'Big Creek', right: null } });
    await user.selectOptions(screen.getByTestId('watershed-swipe-left-select'), 'Sennis');
    expect(store.get(swipeWatershedAtom).left).toBe('Sennis');
  });

  it('changing the compare dropdown updates swipeWatershedAtom.right', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({ swipe: { left: 'Big Creek', right: null } });
    await user.selectOptions(screen.getByTestId('watershed-swipe-right-select'), 'Sennis');
    expect(store.get(swipeWatershedAtom).right).toBe('Sennis');
  });

  it('close button clears both swipe slots', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({ swipe: { left: 'Big Creek', right: 'Sennis' } });
    await user.click(screen.getByTestId('watershed-swipe-close'));
    expect(store.get(swipeWatershedAtom)).toEqual({ left: null, right: null });
  });
});
