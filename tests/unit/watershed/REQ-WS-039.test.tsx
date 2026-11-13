import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom, activeScenarioAtom } from '@/atoms';
import type { ScenarioId } from '@/features/scenarios/matrix';
import { ScenarioImpactPanel } from '@/features/watershed/domain/ScenarioImpactPanel';

const useScenarioImpactMock = vi.fn();

vi.mock('@/lib/data/hooks/useScenarioImpact', () => ({
  useScenarioImpact: (...args: unknown[]) => useScenarioImpactMock(...args),
}));

beforeEach(() => {
  useScenarioImpactMock.mockReset();
});

function renderPanel(opts: { scenarioId?: ScenarioId | null } = {}) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  if (opts.scenarioId !== undefined) store.set(activeScenarioAtom, opts.scenarioId);
  return {
    store,
    ...render(
      <Provider store={store}>
        <ScenarioImpactPanel />
      </Provider>,
    ),
  };
}

describe('REQ-WS-039: ScenarioImpactPanel', () => {
  it('renders the picker even when no scenario is selected', () => {
    useScenarioImpactMock.mockReturnValue({
      watershedDeltas: new Map(),
      coastDeltas: new Map(),
      marineImpact: null,
      loading: false,
      error: null,
    });
    renderPanel({ scenarioId: null });
    expect(screen.getByTestId('watershed-scenario-impact-panel')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-picker')).toBeInTheDocument();
    expect(screen.queryByTestId('watershed-coast-delta')).toBeNull();
    expect(screen.queryByTestId('scenario-time-series')).toBeNull();
    expect(screen.queryByTestId('marine-downstream-hint')).toBeNull();
  });

  it('renders the full panel when a scenario is active', () => {
    useScenarioImpactMock.mockReturnValue({
      watershedDeltas: new Map([['Big Creek', -10]]),
      coastDeltas: new Map([['Coast A', -5]]),
      marineImpact: { sediment_stressed_pct: -12, lbc_attribution: 0.35 },
      loading: false,
      error: null,
    });
    renderPanel({ scenarioId: 'G' });
    expect(screen.getByTestId('watershed-coast-delta')).toBeInTheDocument();
    expect(screen.getByTestId('scenario-time-series')).toBeInTheDocument();
    expect(screen.getByTestId('marine-downstream-hint')).toBeInTheDocument();
  });

  it('does not render MarineDownstreamHint when marineImpact is null', () => {
    useScenarioImpactMock.mockReturnValue({
      watershedDeltas: new Map([['Big Creek', -10]]),
      coastDeltas: new Map(),
      marineImpact: null,
      loading: false,
      error: null,
    });
    renderPanel({ scenarioId: 'G' });
    expect(screen.queryByTestId('marine-downstream-hint')).toBeNull();
  });
});
