import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import type { Feature, FeatureCollection } from 'geojson';
import { activeSiteAtom, selectedPolygonAtom } from '@/atoms';
import { vi } from 'vitest';
import { RusleFormulaCard } from '@/features/watershed/domain/RusleFormulaCard';

const placenciaFeature: Feature = {
  type: 'Feature',
  properties: {
    Name: 'Big Creek',
    mean_r_factor: 5200,
    K_factor: 0.32,
    LS_factor: 1.4,
    C_factor: 0.18,
    P_factor: 0.7,
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
  features: [placenciaFeature],
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

function renderCard(opts: { selected?: { layerId: string; featureId: string } } = {}) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  if (opts.selected) store.set(selectedPolygonAtom, opts.selected);
  return render(
    <Provider store={store}>
      <RusleFormulaCard />
    </Provider>,
  );
}

describe('REQ-WS-015: RusleFormulaCard', () => {
  it('renders the A = R × K × LS × C × P formula header', () => {
    renderCard();
    const card = screen.getByTestId('watershed-rusle-card');
    expect(card).toHaveTextContent(/A\s*=\s*R\s*[×x]\s*K\s*[×x]\s*LS\s*[×x]\s*C\s*[×x]\s*P/);
  });

  it('exposes id="watershed-rusle-card" so the hero CTA can scroll to it', () => {
    renderCard();
    expect(document.getElementById('watershed-rusle-card')).not.toBeNull();
  });

  it('renders all five RUSLE factor cards', () => {
    renderCard();
    expect(screen.getByTestId('rusle-factor-R')).toBeInTheDocument();
    expect(screen.getByTestId('rusle-factor-K')).toBeInTheDocument();
    expect(screen.getByTestId('rusle-factor-LS')).toBeInTheDocument();
    expect(screen.getByTestId('rusle-factor-C')).toBeInTheDocument();
    expect(screen.getByTestId('rusle-factor-P')).toBeInTheDocument();
  });

  it('shows polygon-specific values when a polygon is selected', () => {
    renderCard({ selected: { layerId: 'watershed-polygons', featureId: 'Big Creek' } });
    expect(within(screen.getByTestId('rusle-factor-R')).getByText(/5200|5,200/)).toBeInTheDocument();
    expect(within(screen.getByTestId('rusle-factor-K')).getByText(/0\.32/)).toBeInTheDocument();
    expect(within(screen.getByTestId('rusle-factor-LS')).getByText(/1\.4/)).toBeInTheDocument();
  });

  it('shows a select-first placeholder when no polygon is selected', () => {
    renderCard();
    expect(within(screen.getByTestId('rusle-factor-K')).getByText(/select a watershed first/i)).toBeInTheDocument();
  });

  it('expanding a factor reveals its source citation', async () => {
    const user = userEvent.setup();
    renderCard();
    const rFactor = screen.getByTestId('rusle-factor-R') as HTMLDetailsElement;
    const summary = rFactor.querySelector('summary');
    expect(summary).not.toBeNull();
    await user.click(summary!);
    expect(rFactor.open).toBe(true);
    expect(within(rFactor).getByTestId('rusle-source-R')).toBeInTheDocument();
    expect(within(rFactor).getByTestId('rusle-source-R')).toHaveTextContent(/Renard|RUSLE/);
  });
});
