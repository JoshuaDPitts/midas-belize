import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom, inspectedFeatureAtom, type FeatureHit } from '@/atoms';
import { PolygonFocusCard } from '@/features/marine/domain/PolygonFocusCard';
import { StockFlowIndicator } from '@/features/marine/domain/StockFlowIndicator';

describe('REQ-MA-004 — StockFlowIndicator', () => {
  it('renders label, value, and unit', () => {
    render(<StockFlowIndicator label="Coral cover" value={42} unit="%" direction="increasing" />);
    expect(screen.getByText('Coral cover')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('exposes direction via data-direction attribute', () => {
    const { container } = render(
      <StockFlowIndicator label="x" value={1} unit="" direction="decreasing" />,
    );
    expect(container.querySelector('[data-direction="decreasing"]')).toBeInTheDocument();
  });
});

describe('REQ-MA-004 — PolygonFocusCard', () => {
  function renderCard(feature: FeatureHit | null) {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(inspectedFeatureAtom, feature);
    return render(
      <Provider store={store}>
        <PolygonFocusCard />
      </Provider>,
    );
  }

  it('shows empty state when no polygon is inspected', () => {
    renderCard(null);
    expect(screen.getByTestId('polygon-focus-empty')).toHaveTextContent(/No polygon selected/);
  });

  it('shows polygon id + summary when a feature is inspected', () => {
    renderCard({
      layerId: 'placencia-marine-polygons',
      featureId: 17,
      properties: { MIMES_ID: 17, NbS_Score: 0.71 },
      lngLat: [-88.36, 16.55],
    });
    expect(screen.getByTestId('polygon-focus-summary')).toHaveTextContent(/Polygon 17/);
    expect(screen.getByTestId('polygon-focus-summary')).toHaveTextContent(/0.71/);
  });
});
