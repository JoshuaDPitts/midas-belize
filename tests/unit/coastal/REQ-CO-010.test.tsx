/**
 * REQ-CO-010: CoastalResolutionToggle — hi-res / lo-res pill pair
 *
 * Tests:
 * 1. Renders two pills: "Hi-res (30)" and "Lo-res (8)"
 * 2. Clicking a pill writes coastalResolutionAtom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { coastalResolutionAtom } from '@/atoms';
import { CoastalResolutionToggle } from '@/features/coastal/map/CoastalResolutionToggle';

function renderWith(initialResolution?: 'hires' | 'lores') {
  const store = createStore();
  if (initialResolution !== undefined) {
    store.set(coastalResolutionAtom, initialResolution);
  }
  return {
    store,
    ...render(
      <Provider store={store}>
        <CoastalResolutionToggle />
      </Provider>,
    ),
  };
}

// ---------------------------------------------------------------------------
// 1. Renders two pills: "Hi-res (30)" and "Lo-res (8)"
// ---------------------------------------------------------------------------
describe('REQ-CO-010: CoastalResolutionToggle renders two pills', () => {
  it('renders a radiogroup', () => {
    renderWith();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('renders "Hi-res (30)" pill', () => {
    renderWith();
    expect(screen.getByRole('radio', { name: /hi-res \(30\)/i })).toBeInTheDocument();
  });

  it('renders "Lo-res (8)" pill', () => {
    renderWith();
    expect(screen.getByRole('radio', { name: /lo-res \(8\)/i })).toBeInTheDocument();
  });

  it('active pill has aria-checked="true"', () => {
    renderWith('hires');
    const hiresPill = screen.getByRole('radio', { name: /hi-res \(30\)/i });
    expect(hiresPill).toHaveAttribute('aria-checked', 'true');
    const loresPill = screen.getByRole('radio', { name: /lo-res \(8\)/i });
    expect(loresPill).toHaveAttribute('aria-checked', 'false');
  });
});

// ---------------------------------------------------------------------------
// 2. Clicking a pill writes coastalResolutionAtom
// ---------------------------------------------------------------------------
describe('REQ-CO-010: Clicking pills writes coastalResolutionAtom', () => {
  it('clicking "Lo-res (8)" sets coastalResolutionAtom to lores', async () => {
    const user = userEvent.setup();
    const { store } = renderWith('hires');
    await user.click(screen.getByRole('radio', { name: /lo-res \(8\)/i }));
    expect(store.get(coastalResolutionAtom)).toBe('lores');
  });

  it('clicking "Hi-res (30)" sets coastalResolutionAtom to hires', async () => {
    const user = userEvent.setup();
    const { store } = renderWith('lores');
    await user.click(screen.getByRole('radio', { name: /hi-res \(30\)/i }));
    expect(store.get(coastalResolutionAtom)).toBe('hires');
  });
});
