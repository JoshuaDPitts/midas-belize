/**
 * REQ-CO-020: ScenarioPicker — grouped pills for coastal scenario selection
 *
 * Tests:
 * 1. Renders two groups: "Urban-driven" (G, B) and "SLR-driven" (F, C, D, E, A)
 * 2. Clicking a pill dispatches activeScenarioAtom with the scenario id
 * 3. BaseCase pill is shown ('basecase' scenario), clicking it dispatches 'basecase'
 * 4. Each pill has a title attribute showing three-axis values
 * 5. Groups have role="radiogroup"
 */
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { activeScenarioAtom } from '@/atoms';
import { ScenarioPicker } from '@/features/coastal/domain/ScenarioPicker';
import type { ScenarioId } from '@/features/scenarios/matrix';

function renderWith(initialScenario: ScenarioId | null = null) {
  const store = createStore();
  store.set(activeScenarioAtom, initialScenario);
  const result = render(
    <Provider store={store}>
      <ScenarioPicker />
    </Provider>,
  );
  return { store, ...result };
}

// ---------------------------------------------------------------------------
// 1. Renders two groups with correct scenario pills
// ---------------------------------------------------------------------------
describe('REQ-CO-020: group rendering', () => {
  it('renders an "Urban-driven" group label', () => {
    renderWith();
    expect(screen.getByText(/urban-driven/i)).toBeInTheDocument();
  });

  it('renders an "SLR-driven" group label', () => {
    renderWith();
    expect(screen.getByText(/slr-driven/i)).toBeInTheDocument();
  });

  it('renders scenario G pill in Urban-driven group', () => {
    renderWith();
    expect(screen.getByText('G')).toBeInTheDocument();
  });

  it('renders scenario B pill in Urban-driven group', () => {
    renderWith();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders scenarios F, C, D, E, A in SLR-driven group', () => {
    renderWith();
    for (const id of ['F', 'C', 'D', 'E', 'A']) {
      expect(screen.getByText(id)).toBeInTheDocument();
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Clicking a scenario pill dispatches activeScenarioAtom
// ---------------------------------------------------------------------------
describe('REQ-CO-020: pill click dispatches scenario', () => {
  it('clicking scenario G sets activeScenarioAtom to "G"', () => {
    const { store } = renderWith();
    fireEvent.click(screen.getByText('G'));
    expect(store.get(activeScenarioAtom)).toBe('G');
  });

  it('clicking scenario F sets activeScenarioAtom to "F"', () => {
    const { store } = renderWith();
    fireEvent.click(screen.getByText('F'));
    expect(store.get(activeScenarioAtom)).toBe('F');
  });
});

// ---------------------------------------------------------------------------
// 3. BaseCase pill shown, clicking dispatches 'basecase'
// ---------------------------------------------------------------------------
describe('REQ-CO-020: base case pill', () => {
  it('renders a Base Case pill', () => {
    renderWith();
    // "Base Case" or a pill labeled as base/reference
    expect(screen.getByText(/base case/i)).toBeInTheDocument();
  });

  it('clicking Base Case sets activeScenarioAtom to "basecase"', () => {
    const { store } = renderWith('G'); // start with a scenario selected
    fireEvent.click(screen.getByText(/base case/i));
    expect(store.get(activeScenarioAtom)).toBe('basecase');
  });
});

// ---------------------------------------------------------------------------
// 4. Pills have title attribute with three-axis values
// ---------------------------------------------------------------------------
describe('REQ-CO-020: pill title attributes', () => {
  it('scenario G pill has a title attribute with axis values', () => {
    const { container } = renderWith();
    const gPill = screen.getByText('G').closest('button');
    expect(gPill).toHaveAttribute('title');
    const title = gPill!.getAttribute('title')!;
    expect(title).toMatch(/erosion/i);
    expect(title).toMatch(/slr/i);
    expect(title).toMatch(/urban/i);
  });

  it('scenario F pill title mentions High SLR', () => {
    const { container } = renderWith();
    const fPill = screen.getByText('F').closest('button');
    const title = fPill!.getAttribute('title')!;
    expect(title).toMatch(/high/i);
  });
});

// ---------------------------------------------------------------------------
// 5. Groups have role="radiogroup"
// ---------------------------------------------------------------------------
describe('REQ-CO-020: radiogroup role', () => {
  it('at least two elements have role="radiogroup"', () => {
    renderWith();
    const groups = screen.getAllByRole('radiogroup');
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });
});
