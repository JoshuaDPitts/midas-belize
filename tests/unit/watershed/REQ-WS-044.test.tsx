import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import {
  activeFeatureAtom,
  activeSiteAtom,
  selectedPolygonAtom,
  activeScenarioAtom,
} from '@/atoms';
import { MarineDownstreamHint } from '@/features/watershed/domain/MarineDownstreamHint';
import { SedimentMassBalance } from '@/features/watershed/domain/SedimentMassBalance';

const useMassBalanceMock = vi.fn();
const useScenariosMock = vi.fn();

vi.mock('@/lib/data/hooks/useMassBalance', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/hooks/useMassBalance')>(
    '@/lib/data/hooks/useMassBalance',
  );
  return {
    ...actual,
    useMassBalanceForSite: () => useMassBalanceMock(),
  };
});

vi.mock('@/lib/data', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data')>('@/lib/data');
  return {
    ...actual,
    useScenarios: () => useScenariosMock(),
  };
});

beforeEach(() => {
  useMassBalanceMock.mockReset();
  useScenariosMock.mockReset();
  useScenariosMock.mockReturnValue({ scenarios: [], loading: false, error: null });
});

describe('REQ-WS-044: three-hop bridge wiring', () => {
  it('MarineDownstreamHint dispatches activeFeature + activeSite + clears polygon on click', async () => {
    const user = userEvent.setup();
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(selectedPolygonAtom, { layerId: 'watershed-polygons', featureId: 'Big Creek' });
    render(
      <Provider store={store}>
        <MarineDownstreamHint
          marineImpact={{ sediment_stressed_pct: -12, lbc_attribution: 0.4 }}
        />
      </Provider>,
    );
    await user.click(screen.getByTestId('marine-downstream-hint'));
    expect(store.get(activeFeatureAtom)).toBe('marine');
    expect(store.get(activeSiteAtom)).toBe('laughing-bird');
    expect(store.get(selectedPolygonAtom)).toBeNull();
  });

  it('SedimentMassBalance Nearshore fate click bridges to Marine@LBC', async () => {
    useMassBalanceMock.mockReturnValue({
      sources: [{ polygonId: 'Big Creek', name: 'Big Creek', tPerYr: 100 }],
      transport: { drainage_t_per_yr: 40 },
      fates: { coastal: 24, nearshore: 12, offshore: 4 },
      total: 100,
      deliveryRatio: 0.4,
      loading: false,
      error: null,
    });
    const user = userEvent.setup();
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(selectedPolygonAtom, { layerId: 'watershed-polygons', featureId: 'Big Creek' });
    render(
      <Provider store={store}>
        <SedimentMassBalance />
      </Provider>,
    );
    await user.click(screen.getByTestId('sankey-fate-nearshore'));
    expect(store.get(activeFeatureAtom)).toBe('marine');
    expect(store.get(activeSiteAtom)).toBe('laughing-bird');
    expect(store.get(selectedPolygonAtom)).toBeNull();
  });

  it('SedimentMassBalance Coastal fate click does NOT bridge (stays in-vertical)', async () => {
    useMassBalanceMock.mockReturnValue({
      sources: [{ polygonId: 'Big Creek', name: 'Big Creek', tPerYr: 100 }],
      transport: { drainage_t_per_yr: 40 },
      fates: { coastal: 24, nearshore: 12, offshore: 4 },
      total: 100,
      deliveryRatio: 0.4,
      loading: false,
      error: null,
    });
    const user = userEvent.setup();
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    render(
      <Provider store={store}>
        <SedimentMassBalance />
      </Provider>,
    );
    await user.click(screen.getByTestId('sankey-fate-coastal'));
    expect(store.get(activeFeatureAtom)).toBeNull();
    expect(store.get(activeSiteAtom)).toBe('placencia');
  });

  it('SedimentMassBalance does not regress when no scenario selected', () => {
    useMassBalanceMock.mockReturnValue({
      sources: [],
      transport: { drainage_t_per_yr: 0 },
      fates: { coastal: 0, nearshore: 0, offshore: 0 },
      total: 0,
      deliveryRatio: 0.4,
      loading: false,
      error: null,
    });
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(activeScenarioAtom, null);
    render(
      <Provider store={store}>
        <SedimentMassBalance />
      </Provider>,
    );
    expect(screen.getByTestId('sediment-mass-balance')).toBeInTheDocument();
  });
});
