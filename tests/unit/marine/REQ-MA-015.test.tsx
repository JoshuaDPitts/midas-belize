import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { selectedPolygonAtom, hoveredPolygonAtom } from '@/atoms';
import { PolygonInteraction } from '@/features/marine/map/PolygonInteraction';

function renderInteraction() {
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <PolygonInteraction />
      </Provider>,
    ),
  };
}

describe('REQ-MA-015 — PolygonInteraction', () => {
  it('Escape clears selectedPolygonAtom', async () => {
    const { store } = renderInteraction();
    store.set(selectedPolygonAtom, { layerId: 'placencia-marine-polygons', featureId: 17 });
    const user = userEvent.setup();
    await user.keyboard('{Escape}');
    expect(store.get(selectedPolygonAtom)).toBeNull();
  });

  it('Escape does not error when nothing is selected', async () => {
    const { store } = renderInteraction();
    expect(store.get(selectedPolygonAtom)).toBeNull();
    const user = userEvent.setup();
    await user.keyboard('{Escape}');
    expect(store.get(selectedPolygonAtom)).toBeNull();
  });

  it('mouse leaves the map area clears hoveredPolygonAtom', () => {
    const { store, container } = renderInteraction();
    store.set(hoveredPolygonAtom, { layerId: 'placencia-marine-polygons', featureId: 17 });
    const root = container.querySelector('[data-testid="polygon-interaction-root"]');
    expect(root).not.toBeNull();
    if (root) {
      root.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    }
    expect(store.get(hoveredPolygonAtom)).toBeNull();
  });
});
