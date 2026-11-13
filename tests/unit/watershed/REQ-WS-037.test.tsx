import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeFeatureAtom } from '@/atoms';
import { MarineDownstreamHint } from '@/features/watershed/domain/MarineDownstreamHint';

function renderWith(marineImpact: Parameters<typeof MarineDownstreamHint>[0]['marineImpact']) {
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <MarineDownstreamHint marineImpact={marineImpact} />
      </Provider>,
    ),
  };
}

describe('REQ-WS-037: MarineDownstreamHint', () => {
  it('renders nothing when marineImpact is null', () => {
    const { container } = renderWith(null);
    expect(container.firstChild).toBeNull();
  });

  it('renders the formatted pill when marineImpact is non-null', () => {
    renderWith({ sediment_stressed_pct: -12, lbc_attribution: null });
    const pill = screen.getByTestId('marine-downstream-hint');
    expect(pill.textContent).toMatch(/12%/);
    expect(pill.textContent).toMatch(/sediment-stressed/);
  });

  it('uses ↓ arrow for negative impact (improvement) and ↑ for positive', () => {
    const { rerender } = renderWith({ sediment_stressed_pct: -8, lbc_attribution: null });
    expect(screen.getByTestId('marine-downstream-hint').textContent).toMatch(/↓/);
    rerender(
      <Provider store={createStore()}>
        <MarineDownstreamHint marineImpact={{ sediment_stressed_pct: 9, lbc_attribution: null }} />
      </Provider>,
    );
    expect(screen.getByTestId('marine-downstream-hint').textContent).toMatch(/↑/);
  });

  it('shows the Laughing Bird attribution suffix when present', () => {
    renderWith({ sediment_stressed_pct: -8, lbc_attribution: 0.42 });
    expect(screen.getByTestId('marine-downstream-hint').textContent).toMatch(/42%/);
    expect(screen.getByTestId('marine-downstream-hint').textContent).toMatch(/Laughing Bird/);
  });

  it('clicking sets activeFeatureAtom = marine', async () => {
    const user = userEvent.setup();
    const { store } = renderWith({ sediment_stressed_pct: -5, lbc_attribution: null });
    await user.click(screen.getByTestId('marine-downstream-hint'));
    expect(store.get(activeFeatureAtom)).toBe('marine');
  });
});
