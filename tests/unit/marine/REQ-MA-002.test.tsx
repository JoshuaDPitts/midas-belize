import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { SWRConfig } from 'swr';
import { vi } from 'vitest';
import { activeSiteAtom } from '@/atoms';
import { MarineDomainContent } from '@/features/marine/domain/MarineDomainContent';

function renderContent(site: 'placencia' | 'caye-caulker' | 'laughing-bird' | null = 'placencia') {
  const store = createStore();
  store.set(activeSiteAtom, site);
  global.fetch = vi.fn(async () => new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }))) as typeof fetch;
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Provider store={store}>
        <MarineDomainContent />
      </Provider>
    </SWRConfig>,
  );
}

describe('REQ-MA-002 — MarineDomainContent skeleton', () => {
  // Spec change MA-016: The header moved from MarineDomainContent into SiteAggregateCard.
  // The site label is now shown via the site-aggregate-label testid inside SiteAggregateCard.
  it('renders the SiteAggregateCard hero when activeSite is selected', async () => {
    renderContent('placencia');
    // SWR loading skeleton resolves after fetch completes; wait for it.
    await waitFor(() => expect(screen.queryByTestId('site-aggregate-skeleton')).not.toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByTestId('site-aggregate-label')).toHaveTextContent(/Placencia/i);
  });

  it('renders default-mode (SiteAggregateCard CTA) when no polygon is selected', async () => {
    renderContent('placencia');
    // After skeleton resolves, default mode shows the CTA.
    await waitFor(() => expect(screen.queryByTestId('site-aggregate-skeleton')).not.toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByTestId('site-aggregate-cta')).toBeInTheDocument();
  });

  it('shows "pick a site" prompt when activeSite is null (Belize-wide)', () => {
    renderContent(null);
    expect(screen.getByTestId('marine-domain-pick-site')).toBeInTheDocument();
  });
});
