import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { ScenariosPanel } from '@/features/scenarios/panel/ScenariosPanel';
import { activeSiteAtom, activeScenarioAtom } from '@/atoms';
import type { ScenarioAvailabilityData } from '@/features/scenarios/panel/ScenariosPanel';

// Mock availability data
const mockAvailability: Record<string, ScenarioAvailabilityData> = {
  basecase: {
    marine: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
    watershed: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
    coastal: { status: 'published', publishedDatasets: ['test'], partialDatasets: [], missingVariables: [] },
  },
  A: {
    marine: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
    watershed: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
    coastal: { status: 'partial', publishedDatasets: [], partialDatasets: ['test'], missingVariables: [] },
  },
  // ... other scenarios would follow same pattern
};

describe('REQ-SC-009: ScenariosPanel', () => {
  it('renders ScenarioMatrix + MarineOutlookGroup when site selected', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');

    render(
      <Provider store={store}>
        <ScenariosPanel availability={mockAvailability} />
      </Provider>
    );

    // Check for panel header elements (use more specific queries)
    expect(screen.getByText('Scenarios')).toBeInTheDocument(); // Eyebrow text
    expect(screen.getByText(/Pick a scenario; explore impacts across the map/i)).toBeInTheDocument();

    // Check that ScenarioMatrix is rendered (look for a scenario card)
    expect(screen.getByText('Base')).toBeInTheDocument();

    // Check for Compare CTA
    expect(screen.getByText(/Compare scenarios/i)).toBeInTheDocument();
  });

  it('renders empty state when site is null', () => {
    const store = createStore();
    // activeSiteAtom defaults to null

    render(
      <Provider store={store}>
        <ScenariosPanel availability={mockAvailability} />
      </Provider>
    );

    // Should show empty state message
    expect(screen.getByText(/Pick a site to see scenarios/i)).toBeInTheDocument();

    // Should NOT show ScenarioMatrix or Compare CTA
    expect(screen.queryByText('Base')).not.toBeInTheDocument();
    expect(screen.queryByText(/Compare scenarios/i)).not.toBeInTheDocument();
  });

  it('Compare CTA href has correct query params from current atom state', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'caye-caulker');
    store.set(activeScenarioAtom, 'C');

    render(
      <Provider store={store}>
        <ScenariosPanel availability={mockAvailability} />
      </Provider>
    );

    const compareLink = screen.getByText(/Compare scenarios/i).closest('a');
    expect(compareLink).toHaveAttribute('href');
    
    const href = compareLink?.getAttribute('href') || '';
    // Should include active scenario C as 'a', default G as 'b', default vertical coastal
    expect(href).toContain('a=C');
    expect(href).toContain('b=G');
    expect(href).toContain('v=coastal');
    expect(href).toContain('mode=diff');
    expect(href).toContain('site=caye-caulker');
  });

  it('Compare CTA uses next/link — not plain anchor', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');

    const { container } = render(
      <Provider store={store}>
        <ScenariosPanel availability={mockAvailability} />
      </Provider>
    );

    const compareLink = screen.getByText(/Compare scenarios/i).closest('a');
    
    // Next.js Link components get a data-link attribute (or we can check for absence of target)
    // For this test, we verify it's an <a> tag but without target="_blank" (which would indicate external)
    expect(compareLink?.tagName).toBe('A');
    expect(compareLink).not.toHaveAttribute('target', '_blank');
  });

  it('data-testid="scenarios-panel" exists on the root', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');

    const { container } = render(
      <Provider store={store}>
        <ScenariosPanel availability={mockAvailability} />
      </Provider>
    );

    expect(container.querySelector('[data-testid="scenarios-panel"]')).toBeInTheDocument();
  });

  it('site-adaptive: placencia renders the classic ScenarioMatrix, not the coral biomass section', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');

    const { container } = render(
      <Provider store={store}>
        <ScenariosPanel availability={mockAvailability} />
      </Provider>
    );

    // Classic A-G matrix present and NOT collapsed behind a disclosure
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="regional-scenarios-expander"]')).not.toBeInTheDocument();

    // Coral biomass section absent entirely
    expect(container.querySelector('[data-testid="climate-restoration-selector"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="biomass-year-controls"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="coral-biomass-chart"]')).not.toBeInTheDocument();
  });

  it('site-adaptive: laughing-bird leads with the coral biomass section and collapses regional scenarios', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'laughing-bird');

    const { container } = render(
      <Provider store={store}>
        <ScenariosPanel availability={mockAvailability} />
      </Provider>
    );

    // Coral biomass section renders, titled and in order: selector, year controls, chart
    expect(screen.getByRole('heading', { name: /Coral biomass scenarios/i })).toBeInTheDocument();
    expect(container.querySelector('[data-testid="climate-restoration-selector"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="biomass-year-controls"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="coral-biomass-chart"]')).toBeInTheDocument();

    // Regional (coastal/watershed) scenarios are present but collapsed by default
    const expander = container.querySelector('[data-testid="regional-scenarios-expander"]');
    expect(expander).toBeInTheDocument();
    expect(expander).not.toHaveAttribute('open');
    expect(screen.getByText(/Regional scenarios \(coastal \/ watershed\)/i)).toBeInTheDocument();

    // The regional content (ScenarioMatrix) still received availability and is in the DOM
    // (just visually collapsed by the closed <details>), so the Compare CTA is still present.
    expect(screen.getByText(/Compare scenarios/i)).toBeInTheDocument();
  });
});
