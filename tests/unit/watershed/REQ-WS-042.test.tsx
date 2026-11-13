import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom, activeScenarioAtom } from '@/atoms';
import type { ScenarioId } from '@/features/scenarios/matrix';
import { SedimentMassBalance } from '@/features/watershed/domain/SedimentMassBalance';

const useMassBalanceMock = vi.fn();

vi.mock('@/lib/data/hooks/useMassBalance', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/hooks/useMassBalance')>(
    '@/lib/data/hooks/useMassBalance',
  );
  return {
    ...actual,
    useMassBalanceForSite: () => useMassBalanceMock(),
  };
});

beforeEach(() => {
  useMassBalanceMock.mockReset();
});

function renderWith(opts: { scenarioId?: ScenarioId | null } = {}) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  if (opts.scenarioId !== undefined) store.set(activeScenarioAtom, opts.scenarioId);
  return {
    store,
    ...render(
      <Provider store={store}>
        <SedimentMassBalance />
      </Provider>,
    ),
  };
}

const NON_ZERO_BALANCE = {
  sources: [{ polygonId: 'Big Creek', name: 'Big Creek', tPerYr: 100 }],
  transport: { drainage_t_per_yr: 40 },
  fates: { coastal: 24, nearshore: 12, offshore: 4 },
  total: 100,
  deliveryRatio: 0.4,
  loading: false,
  error: null,
};

describe('REQ-WS-042: SedimentMassBalance', () => {
  it('renders the Sankey when source yields are non-zero', () => {
    useMassBalanceMock.mockReturnValue(NON_ZERO_BALANCE);
    renderWith();
    expect(screen.getByTestId('sediment-mass-balance')).toBeInTheDocument();
    expect(screen.getByTestId('sankey-source-Big Creek')).toBeInTheDocument();
  });

  it('shows Sankey empty state when total is zero', () => {
    useMassBalanceMock.mockReturnValue({
      sources: [],
      transport: { drainage_t_per_yr: 0 },
      fates: { coastal: 0, nearshore: 0, offshore: 0 },
      total: 0,
      deliveryRatio: 0.4,
      loading: false,
      error: null,
    });
    renderWith();
    expect(screen.getByText(/No sediment-yield data joined yet/i)).toBeInTheDocument();
  });

  it('does NOT show the scenario subtitle when no scenario is active', () => {
    useMassBalanceMock.mockReturnValue(NON_ZERO_BALANCE);
    renderWith({ scenarioId: null });
    expect(screen.queryByTestId('sediment-mass-balance-subtitle')).toBeNull();
  });

  it('shows the scenario subtitle when a scenario is active', () => {
    useMassBalanceMock.mockReturnValue(NON_ZERO_BALANCE);
    renderWith({ scenarioId: 'G' });
    expect(screen.getByTestId('sediment-mass-balance-subtitle').textContent).toMatch(
      /Moderate Urban/,
    );
  });

  it('methodology card toggles open/closed via the button', async () => {
    const user = userEvent.setup();
    useMassBalanceMock.mockReturnValue(NON_ZERO_BALANCE);
    renderWith();
    expect(screen.queryByTestId('sediment-mass-balance-formula')).toBeNull();
    await user.click(screen.getByTestId('sediment-mass-balance-formula-toggle'));
    expect(screen.getByTestId('sediment-mass-balance-formula')).toBeInTheDocument();
    expect(screen.getByTestId('sediment-mass-balance-formula').textContent).toMatch(
      /R × K × LS × C × P/,
    );
    await user.click(screen.getByTestId('sediment-mass-balance-formula-toggle'));
    expect(screen.queryByTestId('sediment-mass-balance-formula')).toBeNull();
  });
});
