import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { selectedPolygonAtom } from '@/atoms';
import { SedimentFlowSankey } from '@/features/watershed/domain/SedimentFlowSankey';

function renderWith(props: Parameters<typeof SedimentFlowSankey>[0]) {
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <SedimentFlowSankey {...props} />
      </Provider>,
    ),
  };
}

const NON_EMPTY = {
  sources: [
    { polygonId: 'Big Creek', name: 'Big Creek', tPerYr: 120 },
    { polygonId: 'Sennis', name: 'Sennis', tPerYr: 60 },
  ],
  transport: { drainage_t_per_yr: 72 },
  fates: { coastal: 43.2, nearshore: 21.6, offshore: 7.2 },
  total: 180,
};

describe('REQ-WS-041: SedimentFlowSankey', () => {
  it('renders empty state when total is zero or sources is empty', () => {
    renderWith({
      sources: [],
      transport: { drainage_t_per_yr: 0 },
      fates: { coastal: 0, nearshore: 0, offshore: 0 },
      total: 0,
    });
    expect(screen.getByText(/No sediment-yield data joined yet/i)).toBeInTheDocument();
  });

  it('renders 3 columns: source nodes + drainage + 3 fate nodes', () => {
    renderWith(NON_EMPTY);
    expect(screen.getByTestId('sankey-source-Big Creek')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-source-Sennis')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-drainage')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-fate-coastal')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-fate-nearshore')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-fate-offshore')).toBeInTheDocument();
  });

  it('clicking a source writes selectedPolygonAtom', async () => {
    const user = userEvent.setup();
    const { store } = renderWith(NON_EMPTY);
    await user.click(screen.getByTestId('sankey-source-Big Creek'));
    expect(store.get(selectedPolygonAtom)).toEqual({
      layerId: 'watershed-polygons',
      featureId: 'Big Creek',
    });
  });

  it('clicking a fate node fires onFateClick with the fate key', async () => {
    const user = userEvent.setup();
    const onFateClick = vi.fn();
    renderWith({ ...NON_EMPTY, onFateClick });
    await user.click(screen.getByTestId('sankey-fate-nearshore'));
    expect(onFateClick).toHaveBeenCalledWith('nearshore');
  });

  it('node tooltips include formatted tonnes', () => {
    renderWith(NON_EMPTY);
    const titleEl = screen.getByTestId('sankey-source-Big Creek').querySelector('title');
    expect(titleEl?.textContent).toMatch(/Big Creek/);
    expect(titleEl?.textContent).toMatch(/t\/yr/);
  });
});
