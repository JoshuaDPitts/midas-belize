import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom } from '@/atoms';
import { NavBar } from '@/components/app-shell/NavBar';

function renderWith() {
  const store = createStore();
  return { store, ...render(<Provider store={store}><NavBar /></Provider>) };
}

describe('REQ-LS-012 — NavBar share + reset buttons', () => {
  it('reset button is disabled when at default view', () => {
    renderWith();
    expect(screen.getByTestId('appshell-reset')).toBeDisabled();
  });

  it('reset button enables once any URL-shareable atom moves', async () => {
    const { store } = renderWith();
    store.set(activeSiteAtom, 'placencia');
    expect(await screen.findByTestId('appshell-reset')).toBeEnabled();
  });

  it('reset button click resets activeSiteAtom to null', async () => {
    const user = userEvent.setup();
    const { store } = renderWith();
    store.set(activeSiteAtom, 'placencia');
    await user.click(await screen.findByTestId('appshell-reset'));
    expect(store.get(activeSiteAtom)).toBeNull();
  });

  it('share button writes the URL to clipboard and shows "Copied ✓"', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderWith();
    await user.click(screen.getByTestId('appshell-share'));
    expect(writeText).toHaveBeenCalled();
    expect(await screen.findByText(/Copied/)).toBeInTheDocument();
  });
});
