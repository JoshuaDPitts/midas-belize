import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom } from '@/atoms';
import type { SiteId } from '@/lib/data';
import { WatershedDomainContent } from '@/features/watershed/domain/WatershedDomainContent';

function renderForSite(site: SiteId | null) {
  const store = createStore();
  store.set(activeSiteAtom, site);
  return {
    store,
    ...render(
      <Provider store={store}>
        <WatershedDomainContent />
      </Provider>,
    ),
  };
}

describe('REQ-WS-005: per-site empty states', () => {
  it('renders normal tiers for placencia', () => {
    renderForSite('placencia');
    expect(screen.getByTestId('watershed-tier-1')).toBeInTheDocument();
    expect(screen.queryByTestId('watershed-empty-offshore')).toBeNull();
  });

  it('renders normal tiers for caye-caulker', () => {
    renderForSite('caye-caulker');
    expect(screen.getByTestId('watershed-tier-1')).toBeInTheDocument();
    expect(screen.queryByTestId('watershed-empty-offshore')).toBeNull();
  });

  it('renders normal tiers when site is null (national)', () => {
    renderForSite(null);
    expect(screen.getByTestId('watershed-tier-1')).toBeInTheDocument();
    expect(screen.queryByTestId('watershed-empty-offshore')).toBeNull();
  });

  it('renders offshore empty state for laughing-bird', () => {
    renderForSite('laughing-bird');
    expect(screen.getByTestId('watershed-empty-offshore')).toBeInTheDocument();
    expect(screen.queryByTestId('watershed-tier-1')).toBeNull();
    expect(screen.queryByTestId('watershed-tier-3')).toBeNull();
  });

  it('offshore CTA flips activeSite to placencia', async () => {
    const user = userEvent.setup();
    const { store } = renderForSite('laughing-bird');
    const button = screen.getByRole('button', { name: /upstream context/i });
    await user.click(button);
    expect(store.get(activeSiteAtom)).toBe('placencia');
  });
});
