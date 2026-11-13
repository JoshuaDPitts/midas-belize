import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider as JProvider, createStore as createStore2 } from 'jotai';
import { vi } from 'vitest';
import { SWRConfig } from 'swr';
import { activeSiteAtom, selectedPolygonAtom } from '@/atoms';
import { SecondaryAccordion } from '@/features/marine/domain/SecondaryAccordion';
import { SiteAggregateCard } from '@/features/marine/domain/SiteAggregateCard';
import { MarineHeroPanel } from '@/features/marine/domain/MarineHeroPanel';

describe('REQ-MA-016 — SecondaryAccordion', () => {
  it('renders header label + peek preview when collapsed', () => {
    render(
      <SecondaryAccordion title="Biomass — by guild" peek="Top: Phytoplankton (12.4t)" defaultExpanded={false}>
        <p>Body content</p>
      </SecondaryAccordion>,
    );
    expect(screen.getByText('Biomass — by guild')).toBeInTheDocument();
    expect(screen.getByText(/Top: Phytoplankton/)).toBeInTheDocument();
    expect(screen.queryByText('Body content')).not.toBeVisible();
  });

  it('clicking the header expands the section', async () => {
    const user = userEvent.setup();
    render(
      <SecondaryAccordion title="X" peek="" defaultExpanded={false}>
        <p>Body content</p>
      </SecondaryAccordion>,
    );
    await user.click(screen.getByRole('button', { name: /X/i }));
    expect(screen.getByText('Body content')).toBeVisible();
  });

  it('Space and Enter toggle expansion', async () => {
    const user = userEvent.setup();
    render(
      <SecondaryAccordion title="X" peek="" defaultExpanded={false}>
        <p>Body content</p>
      </SecondaryAccordion>,
    );
    const header = screen.getByRole('button', { name: /X/ });
    header.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByText('Body content')).toBeVisible();
    await user.keyboard(' ');
    expect(screen.queryByText('Body content')).not.toBeVisible();
  });

  it('persists expanded state via sessionStorage when storageKey provided', async () => {
    const user = userEvent.setup();
    sessionStorage.removeItem('marine-accordion-test-key');
    render(
      <SecondaryAccordion title="X" peek="" storageKey="marine-accordion-test-key" defaultExpanded={false}>
        <p>Body content</p>
      </SecondaryAccordion>,
    );
    await user.click(screen.getByRole('button', { name: /X/ }));
    expect(sessionStorage.getItem('marine-accordion-test-key')).toBe('true');
  });
});

describe('REQ-MA-016 — SiteAggregateCard', () => {
  it('renders the site label as a display-font hero', () => {
    render(
      <SiteAggregateCard
        siteLabel="Placencia"
        polygonCount={47}
        avgNbSScore={0.42}
        totalBiomass={null}
        topClades={[
          { index: 14, share: 12.3 },
          { index: 5, share: 8.1 },
          { index: 22, share: 4.7 },
        ]}
        loading={false}
      />,
    );
    expect(screen.getByTestId('site-aggregate-label')).toHaveTextContent('Placencia');
  });

  it('renders polygon count + average NbS as headline stats', () => {
    render(
      <SiteAggregateCard
        siteLabel="Placencia"
        polygonCount={47}
        avgNbSScore={0.42}
        totalBiomass={null}
        topClades={[]}
        loading={false}
      />,
    );
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('0.42')).toBeInTheDocument();
  });

  it('renders top clades as ecosystem names, not raw ordinal ids', () => {
    render(
      <SiteAggregateCard
        siteLabel="Placencia"
        polygonCount={47}
        avgNbSScore={0.42}
        totalBiomass={null}
        topClades={[
          { index: 13, share: 12.3 },
          { index: 14, share: 8.1 },
          { index: 2, share: 4.7 },
        ]}
        loading={false}
      />,
    );
    expect(screen.getByText('Open sea · Seagrass · Coral reef')).toBeInTheDocument();
  });

  it('shows skeleton when loading', () => {
    render(
      <SiteAggregateCard
        siteLabel="Placencia"
        polygonCount={0}
        avgNbSScore={null}
        totalBiomass={null}
        topClades={[]}
        loading={true}
      />,
    );
    expect(screen.getByTestId('site-aggregate-skeleton')).toBeInTheDocument();
  });
});

function renderHero(opts: { selected?: { layerId: string; featureId: string | number } | null; site?: 'placencia' | 'caye-caulker' | null } = {}) {
  const store = createStore2();
  store.set(activeSiteAtom, opts.site ?? 'placencia');
  store.set(selectedPolygonAtom, opts.selected ?? null);
  global.fetch = vi.fn(async () => new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }))) as typeof fetch;
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <JProvider store={store}>
        <MarineHeroPanel />
      </JProvider>
    </SWRConfig>,
  );
}

describe('REQ-MA-016 — MarineHeroPanel', () => {
  it('renders SiteAggregateCard when no polygon selected', async () => {
    renderHero({ selected: null });
    // SWR may start in loading state; wait for the skeleton to resolve.
    await waitFor(() => expect(screen.queryByTestId('site-aggregate-skeleton')).not.toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByTestId('site-aggregate-cta')).toBeInTheDocument();
  });

  it('renders focused-mode content when a polygon is selected', async () => {
    renderHero({ selected: { layerId: 'placencia-marine-polygons', featureId: 17 } });
    // PolygonFocusCard shows polygon-focus-empty until the bridge effect populates
    // inspectedFeatureAtom. With an empty GeoJSON response the feature won't be found,
    // so inspectedFeatureAtom stays null → PolygonFocusCard renders polygon-focus-empty.
    // Focused mode is still rendered (the panel data-mode="focused" is present).
    await waitFor(() =>
      expect(document.querySelector('[data-mode="focused"]')).toBeInTheDocument(),
      { timeout: 3000 },
    );
    expect(document.querySelector('[data-mode="focused"]')).toBeInTheDocument();
  });
});
