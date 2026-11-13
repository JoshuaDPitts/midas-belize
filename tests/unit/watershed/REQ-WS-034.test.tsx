import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom, activeScenarioAtom } from '@/atoms';
import type { ScenarioId } from '@/features/scenarios/matrix';
import { ScenarioPicker } from '@/features/watershed/domain/ScenarioPicker';

function renderWith(opts: { active?: ScenarioId | null } = {}) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  if (opts.active !== undefined) store.set(activeScenarioAtom, opts.active);
  return {
    store,
    ...render(
      <Provider store={store}>
        <ScenarioPicker />
      </Provider>,
    ),
  };
}

describe('REQ-WS-034: ScenarioPicker', () => {
  it('renders Base case pill from canonical matrix', () => {
    renderWith();
    expect(screen.getByTestId('scenario-pill-base')).toBeInTheDocument();
    expect(screen.getByText(/Base Case/i)).toBeInTheDocument();
  });

  it('renders Urban-driven scenarios (G, B) from canonical matrix', () => {
    renderWith();
    expect(screen.getByTestId('scenario-pill-G')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-pill-B')).toBeInTheDocument();
  });

  it('renders SLR-driven scenarios (F, C, D, E, A) from canonical matrix', () => {
    renderWith();
    expect(screen.getByTestId('scenario-pill-F')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-pill-C')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-pill-D')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-pill-E')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-pill-A')).toBeInTheDocument();
  });

  it('Base case pill is active by default (activeScenarioAtom defaults to null)', () => {
    renderWith();
    const basePill = screen.getByTestId('scenario-pill-base');
    expect(basePill.getAttribute('aria-checked')).toBe('false'); // null !== 'basecase'
  });

  it('Base case pill is active when activeScenarioAtom is basecase', () => {
    renderWith({ active: 'basecase' });
    expect(screen.getByTestId('scenario-pill-base').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('scenario-pill-G').getAttribute('aria-checked')).toBe('false');
  });

  it('clicking a scenario pill sets activeScenarioAtom to its id', async () => {
    const user = userEvent.setup();
    const { store } = renderWith();
    await user.click(screen.getByTestId('scenario-pill-G'));
    expect(store.get(activeScenarioAtom)).toBe('G');
  });

  it('clicking Base case sets activeScenarioAtom to basecase', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({ active: 'G' });
    await user.click(screen.getByTestId('scenario-pill-base'));
    expect(store.get(activeScenarioAtom)).toBe('basecase');
  });
});
