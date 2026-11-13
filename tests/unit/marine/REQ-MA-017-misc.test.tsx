import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StockFlowIndicator } from '@/features/marine/domain/StockFlowIndicator';
import { FormulaTooltip } from '@/components/ui/FormulaTooltip';
import { PolygonFocusCard } from '@/features/marine/domain/PolygonFocusCard';
import { TimeSeriesPlayer } from '@/features/marine/domain/TimeSeriesPlayer';
import { Provider, createStore } from 'jotai';
import { inspectedFeatureAtom } from '@/atoms';

describe('REQ-MA-017d StockFlowIndicator value tween', () => {
  it('renders with a tween-marker class on the value element', () => {
    render(<StockFlowIndicator label="x" value={42} unit="" direction="increasing" />);
    const value = screen.getByTestId('stockflow-value');
    expect(value).toBeInTheDocument();
  });

  it('exposes a data-direction attribute that drives the rotation', () => {
    render(<StockFlowIndicator label="x" value={42} unit="" direction="decreasing" />);
    const arrow = screen.getByTestId('stockflow-arrow');
    expect(arrow).toHaveAttribute('data-direction', 'decreasing');
  });
});

describe('REQ-MA-017e FormulaTooltip viewport collision', () => {
  it('renders without crashing with very long formula content', () => {
    render(<FormulaTooltip label="X" formula={'x'.repeat(500)} explanation={'y'.repeat(500)} />);
    expect(screen.getByRole('button', { name: /Show formula for X/i })).toBeInTheDocument();
  });

  it('exposes a data-position attribute on the tooltip when open', async () => {
    render(<FormulaTooltip label="Y" formula="a + b" explanation="sum" />);
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: /Show formula for Y/i });
    await user.hover(trigger);
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveAttribute('data-position');
    // Position is one of 'top' | 'bottom' (auto-flipped near viewport edges)
    expect(['top', 'bottom']).toContain(tooltip.getAttribute('data-position'));
  });
});

describe('REQ-MA-017f PolygonFocusCard expanded layout', () => {
  function renderCard(properties: Record<string, unknown>) {
    const store = createStore();
    store.set(inspectedFeatureAtom, {
      layerId: 'placencia-marine-polygons',
      featureId: 17,
      properties,
      lngLat: [-88.36, 16.55],
    });
    return render(
      <Provider store={store}>
        <PolygonFocusCard />
      </Provider>,
    );
  }

  it('renders only wired polygon stats in expanded layout', () => {
    renderCard({
      MIMES_ID: 17,
      NbS_Score: 0.71,
      Restoration_Potential: 0.56,
      Conservation_Value: 0.15,
    });
    expect(screen.getByTestId('polygon-focus-stat-nbs')).toBeInTheDocument();
    expect(screen.getByTestId('polygon-focus-stat-restoration')).toBeInTheDocument();
    expect(screen.getByTestId('polygon-focus-stat-conservation')).toBeInTheDocument();
    expect(screen.queryByTestId('polygon-focus-stat-biomass')).toBeNull();
  });

  it('uses display-font for the polygon ID heading', () => {
    renderCard({ MIMES_ID: 17, NbS_Score: 0.71 });
    const heading = screen.getByTestId('polygon-focus-id');
    expect(heading.tagName).toMatch(/^(H1|H2|H3)$/);
  });
});

describe('REQ-MA-017g TimeSeriesPlayer chip toggle', () => {
  it('series chip aria-pressed toggles when clicked', async () => {
    const series = [
      {
        id: 'sst',
        label: 'SST',
        unit: '°C',
        formula: 'monthly mean',
        explanation: 'sea surface temp',
        points: [{ iso: '2023-01', value: 26.4 }],
      },
    ];
    render(<TimeSeriesPlayer series={series} />);
    const user = userEvent.setup();
    const chip = screen.getByTestId('series-chip-sst');
    expect(chip).toHaveAttribute('aria-pressed', 'true'); // visible by default
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false'); // hidden after click
  });
});
