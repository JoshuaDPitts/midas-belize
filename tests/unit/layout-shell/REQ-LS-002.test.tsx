import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom, themeAtom } from '@/atoms';
import { NavBar } from '@/components/app-shell/NavBar';

function renderWith(ui: React.ReactNode) {
  const store = createStore();
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
}

describe('REQ-LS-002 — AppShell NavBar', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders MIDAS logo on the left', () => {
    renderWith(<NavBar />);
    expect(screen.getByTestId('appshell-logo')).toBeInTheDocument();
    expect(screen.getByTestId('appshell-logo')).toHaveTextContent(/MIDAS/i);
  });

  it('renders the site selector with "Belize-wide" by default', () => {
    renderWith(<NavBar />);
    const trigger = screen.getByTestId('appshell-site-trigger');
    expect(trigger).toHaveTextContent(/Belize/i);
  });

  it('writes activeSiteAtom when a site is picked', async () => {
    const user = userEvent.setup();
    const { store } = renderWith(<NavBar />);
    await user.click(screen.getByTestId('appshell-site-trigger'));
    await user.click(screen.getByRole('option', { name: /Placencia/i }));
    expect(store.get(activeSiteAtom)).toBe('placencia');
  });

  it('reflects activeSiteAtom changes back into the trigger label', async () => {
    const { store } = renderWith(<NavBar />);
    store.set(activeSiteAtom, 'caye-caulker');
    expect(await screen.findByTestId('appshell-site-trigger')).toHaveTextContent(/Caye Caulker/i);
  });

  it('theme toggle flips themeAtom', async () => {
    const user = userEvent.setup();
    const { store } = renderWith(<NavBar />);
    expect(store.get(themeAtom)).toBe('light');
    await user.click(screen.getByTestId('appshell-theme-toggle'));
    expect(store.get(themeAtom)).toBe('dark');
  });
});
