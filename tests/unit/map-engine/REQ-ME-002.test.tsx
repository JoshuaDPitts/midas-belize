import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore, useAtomValue } from 'jotai';
import { basemapAtom } from '@/atoms';
import { BASEMAPS } from '@/lib/map/core/styles';
import { BasemapSwitcher } from '@/components/map/BasemapSwitcher/BasemapSwitcher';

// ME-002 acceptance criteria covered here:
//  - 4 styles available (light/dark/satellite/terrain)
//  - BasemapSwitcher renders one radio per style, labelled per BASEMAPS[id].label
//  - Clicking a radio toggles basemapAtom to that id
//  - aria-checked tracks the active atom value (single-selection semantics)
//
// The MapLibre setStyle preserves-viewport acceptance criterion is an
// integration behavior covered by tests/e2e/map-engine-functional.spec.ts.

describe('REQ-ME-002 · BasemapSwitcher', () => {
  beforeEach(() => cleanup());

  function renderWithStore(initial?: 'light' | 'dark' | 'satellite' | 'terrain') {
    const store = createStore();
    if (initial) store.set(basemapAtom, initial);
    function Probe() {
      const v = useAtomValue(basemapAtom);
      return <span data-testid="active">{v}</span>;
    }
    render(
      <Provider store={store}>
        <BasemapSwitcher />
        <Probe />
      </Provider>,
    );
    return store;
  }

  it('renders exactly four radios', () => {
    renderWithStore();
    expect(screen.getAllByRole('radio')).toHaveLength(4);
  });

  it('labels match BASEMAPS', () => {
    renderWithStore();
    for (const id of Object.keys(BASEMAPS) as Array<keyof typeof BASEMAPS>) {
      expect(screen.getByRole('radio', { name: BASEMAPS[id].label })).toBeDefined();
    }
  });

  it('defaults with the Light radio aria-checked', () => {
    renderWithStore();
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'false');
  });

  it('clicking a radio updates basemapAtom and flips aria-checked', async () => {
    const user = userEvent.setup();
    const store = renderWithStore();
    await user.click(screen.getByRole('radio', { name: 'Satellite' }));
    expect(store.get(basemapAtom)).toBe('satellite');
    expect(screen.getByRole('radio', { name: 'Satellite' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Light' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('active')).toHaveTextContent('satellite');
  });

  it('respects an initial non-default value', () => {
    renderWithStore('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  });

  it('radiogroup has an accessible name', () => {
    renderWithStore();
    expect(screen.getByRole('radiogroup', { name: 'Basemap style' })).toBeDefined();
  });
});
