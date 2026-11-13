import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { AppShell } from '@/components/app-shell/AppShell';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';

function setMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (q: string) => ({
      matches,
      media: q,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('REQ-LS-013 — AppShell mobile branch', () => {
  it('renders MobileShell when matchMedia says width ≤ 768px', () => {
    setMatchMedia(true);
    render(
      <Provider store={createStore()}>
        <FeaturesProvider value={[]}>
          <AppShell><span data-testid="children">CHILD</span></AppShell>
        </FeaturesProvider>
      </Provider>,
    );
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-shell', 'mobile');
    expect(screen.getByTestId('children')).toBeInTheDocument();
  });

  it('renders DesktopShell when matchMedia says width > 768px', () => {
    setMatchMedia(false);
    render(
      <Provider store={createStore()}>
        <FeaturesProvider value={[]}>
          <AppShell><span data-testid="children">CHILD</span></AppShell>
        </FeaturesProvider>
      </Provider>,
    );
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-shell', 'desktop');
  });

  it('MobileShell exposes a data-mobile-mode attribute for CSS to key off', () => {
    setMatchMedia(true);
    render(
      <Provider store={createStore()}>
        <FeaturesProvider value={[]}>
          <AppShell><span /></AppShell>
        </FeaturesProvider>
      </Provider>,
    );
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-mobile-mode', 'true');
  });
});
