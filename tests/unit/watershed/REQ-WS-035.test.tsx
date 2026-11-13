import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import {
  selectedPolygonAtom,
  hoveredPolygonAtom,
} from '@/atoms';
import { WatershedCoastDelta } from '@/features/watershed/domain/WatershedCoastDelta';

function renderWith(props: {
  ws?: Map<string, number>;
  co?: Map<string, number>;
}) {
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <WatershedCoastDelta
          watershedDeltas={props.ws ?? new Map()}
          coastDeltas={props.co ?? new Map()}
        />
      </Provider>,
    ),
  };
}

describe('REQ-WS-035: WatershedCoastDelta', () => {
  it('renders an empty state when both delta maps are empty', () => {
    renderWith({});
    expect(screen.getByText(/Pick a scenario/i)).toBeInTheDocument();
  });

  it('renders one bar per watershed delta + one per coast delta', () => {
    renderWith({
      ws: new Map([['Big Creek', -12], ['Sennis', 8]]),
      co: new Map([['Coast A', -5], ['Coast B', 3]]),
    });
    expect(screen.getByTestId('watershed-coast-delta-watershed-Big Creek')).toBeInTheDocument();
    expect(screen.getByTestId('watershed-coast-delta-watershed-Sennis')).toBeInTheDocument();
    expect(screen.getByTestId('watershed-coast-delta-coast-Coast A')).toBeInTheDocument();
    expect(screen.getByTestId('watershed-coast-delta-coast-Coast B')).toBeInTheDocument();
  });

  it('sorts rows by absolute magnitude descending', () => {
    renderWith({
      ws: new Map([['SmallΔ', 1], ['BigΔ', 100], ['MedΔ', 25]]),
      co: new Map(),
    });
    const big = screen.getByTestId('watershed-coast-delta-watershed-BigΔ');
    const med = screen.getByTestId('watershed-coast-delta-watershed-MedΔ');
    const small = screen.getByTestId('watershed-coast-delta-watershed-SmallΔ');
    // First in DOM order should be the largest magnitude.
    const docOrder = [big, med, small];
    const allRows = Array.from(
      document.querySelectorAll('[data-testid^="watershed-coast-delta-watershed-"]'),
    );
    expect(allRows.indexOf(docOrder[0])).toBeLessThan(allRows.indexOf(docOrder[1]));
    expect(allRows.indexOf(docOrder[1])).toBeLessThan(allRows.indexOf(docOrder[2]));
  });

  it('hovering a watershed row writes hoveredPolygonAtom', () => {
    const { store } = renderWith({
      ws: new Map([['Big Creek', -12]]),
      co: new Map(),
    });
    fireEvent.mouseEnter(screen.getByTestId('watershed-coast-delta-watershed-Big Creek'));
    expect(store.get(hoveredPolygonAtom)).toEqual({
      layerId: 'watershed-polygons',
      featureId: 'Big Creek',
    });
    fireEvent.mouseLeave(screen.getByTestId('watershed-coast-delta-watershed-Big Creek'));
    expect(store.get(hoveredPolygonAtom)).toBeNull();
  });

  it('clicking a watershed row writes selectedPolygonAtom', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({
      ws: new Map([['Big Creek', -12]]),
      co: new Map(),
    });
    await user.click(screen.getByTestId('watershed-coast-delta-watershed-Big Creek'));
    expect(store.get(selectedPolygonAtom)).toEqual({
      layerId: 'watershed-polygons',
      featureId: 'Big Creek',
    });
  });

  it('renders a connector arc per paired row', () => {
    renderWith({
      ws: new Map([['Big Creek', -12], ['Sennis', 8]]),
      co: new Map([['Coast A', -5], ['Coast B', 3]]),
    });
    expect(screen.getByTestId('watershed-coast-delta-arc-1')).toBeInTheDocument();
    expect(screen.getByTestId('watershed-coast-delta-arc-2')).toBeInTheDocument();
  });
});
