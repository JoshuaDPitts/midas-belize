/**
 * REQ-CO-009: CoastalLegend — encoding-aware gradient legend
 *
 * Tests:
 * 1. Vulnerability encoding: renders green-to-coral gradient with ticks 0 / 0.5 / 1
 * 2. Mangrove encoding: renders green-to-amber gradient with ticks "High" / "Med" / "Low"
 * 3. Scenario-delta encoding: renders green-gray-coral diverging gradient with ticks "-" / "0" / "+"
 * Each test also checks the correct title for the encoding.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { coastalEncodingAtom, type CoastalEncodingMode } from '@/atoms';
import { CoastalLegend } from '@/features/coastal/map/CoastalLegend';

function renderWith(encoding: CoastalEncodingMode) {
  const store = createStore();
  store.set(coastalEncodingAtom, encoding);
  return render(
    <Provider store={store}>
      <CoastalLegend />
    </Provider>,
  );
}

// ---------------------------------------------------------------------------
// 1. Vulnerability encoding
// ---------------------------------------------------------------------------
describe('REQ-CO-009: Vulnerability encoding', () => {
  it('renders the title "Vulnerability Score"', () => {
    renderWith('vulnerability');
    expect(screen.getByText(/vulnerability score/i)).toBeInTheDocument();
  });

  it('renders a green-to-coral gradient bar', () => {
    renderWith('vulnerability');
    const bar = screen.getByTestId('coastal-legend-gradient');
    const bg = bar.style.background || bar.style.backgroundImage;
    // Green → coral: should contain green and coral/red
    expect(bg).toMatch(/green|#2|rgb\(4[0-9]/i);
    expect(bg).toMatch(/coral|#f|rgb\(2[0-9][0-9]/i);
  });

  it('renders ticks 0, 0.5, and 1', () => {
    renderWith('vulnerability');
    expect(screen.getByTestId('coastal-legend-tick-min')).toHaveTextContent('0');
    expect(screen.getByTestId('coastal-legend-tick-mid')).toHaveTextContent('0.5');
    expect(screen.getByTestId('coastal-legend-tick-max')).toHaveTextContent('1');
  });
});

// ---------------------------------------------------------------------------
// 2. Mangrove encoding
// ---------------------------------------------------------------------------
describe('REQ-CO-009: Mangrove encoding', () => {
  it('renders the title "Mangrove Coverage"', () => {
    renderWith('mangrove');
    expect(screen.getByText(/mangrove coverage/i)).toBeInTheDocument();
  });

  it('renders a green-to-amber gradient bar', () => {
    renderWith('mangrove');
    const bar = screen.getByTestId('coastal-legend-gradient');
    const bg = bar.style.background || bar.style.backgroundImage;
    // Green → amber: should contain green and amber/yellow
    expect(bg).toMatch(/green|#2|rgb\(4[0-9]/i);
    expect(bg).toMatch(/amber|yellow|#f|rgb\(25[0-5]/i);
  });

  it('renders ticks High, Med, and Low', () => {
    renderWith('mangrove');
    expect(screen.getByTestId('coastal-legend-tick-min')).toHaveTextContent('High');
    expect(screen.getByTestId('coastal-legend-tick-mid')).toHaveTextContent('Med');
    expect(screen.getByTestId('coastal-legend-tick-max')).toHaveTextContent('Low');
  });
});

// ---------------------------------------------------------------------------
// 3. Scenario-delta encoding
// ---------------------------------------------------------------------------
describe('REQ-CO-009: Scenario-delta encoding', () => {
  it('renders the title "Scenario Delta"', () => {
    renderWith('scenario-delta');
    expect(screen.getByText(/scenario delta/i)).toBeInTheDocument();
  });

  it('renders a diverging green-gray-coral gradient bar', () => {
    renderWith('scenario-delta');
    const bar = screen.getByTestId('coastal-legend-gradient');
    const bg = bar.style.background || bar.style.backgroundImage;
    // Diverging: should contain green and coral/red
    expect(bg).toMatch(/green|#2|rgb\(4[0-9]/i);
    expect(bg).toMatch(/coral|#f|rgb\(2[0-9][0-9]/i);
  });

  it('renders ticks -, 0, and +', () => {
    renderWith('scenario-delta');
    expect(screen.getByTestId('coastal-legend-tick-min')).toHaveTextContent('-');
    expect(screen.getByTestId('coastal-legend-tick-mid')).toHaveTextContent('0');
    expect(screen.getByTestId('coastal-legend-tick-max')).toHaveTextContent('+');
  });
});
