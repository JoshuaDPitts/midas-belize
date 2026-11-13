import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { selectedPolygonAtom } from '@/atoms';
import { WatershedDomainContent } from '@/features/watershed/domain/WatershedDomainContent';

function renderWith(opts: { polygon?: { layerId: string; featureId: string } } = {}) {
  const store = createStore();
  if (opts.polygon) store.set(selectedPolygonAtom, opts.polygon);
  return render(
    <Provider store={store}>
      <WatershedDomainContent />
    </Provider>,
  );
}

describe('REQ-WS-002: 4-tier scaffolding', () => {
  it('renders Tier 1 always', () => {
    renderWith();
    expect(screen.getByTestId('watershed-tier-1')).toBeInTheDocument();
  });

  it('hides Tier 2 when no polygon selected', () => {
    renderWith();
    expect(screen.queryByTestId('watershed-tier-2')).toBeNull();
  });

  it('shows Tier 2 when polygon selected', () => {
    renderWith({ polygon: { layerId: 'watershed-polygons', featureId: '1' } });
    expect(screen.getByTestId('watershed-tier-2')).toBeInTheDocument();
  });

  it('renders Tier 3 deep-dive accordion always', () => {
    renderWith();
    expect(screen.getByTestId('watershed-tier-3')).toBeInTheDocument();
  });

  it('renders Tier 4 scenario lane always', () => {
    renderWith();
    expect(screen.getByTestId('watershed-tier-4')).toBeInTheDocument();
  });
});
