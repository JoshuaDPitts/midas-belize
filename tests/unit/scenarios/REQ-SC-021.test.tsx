import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeltaSparkline } from '@/features/scenarios/compare/DeltaSparkline';

describe('REQ-SC-021: DeltaSparkline', () => {
  it('renders 2 polylines with correct point counts', () => {
    const baseSeries = [10, 20, 15, 25, 30];
    const scenarioSeries = [12, 18, 20, 22, 28];

    render(
      <DeltaSparkline
        baseSeries={baseSeries}
        scenarioSeries={scenarioSeries}
        ariaLabel="Test sparkline"
      />
    );

    const svg = screen.getByRole('img', { name: /test sparkline/i });
    expect(svg).toBeInTheDocument();

    // Should have two polylines
    const polylines = svg.querySelectorAll('polyline');
    expect(polylines).toHaveLength(2);

    // Base polyline should have dashed stroke
    const baseLine = polylines[0];
    expect(baseLine).toHaveAttribute('stroke-dasharray');

    // Scenario polyline should be solid (no dasharray)
    const scenarioLine = polylines[1];
    expect(scenarioLine).not.toHaveAttribute('stroke-dasharray');

    // Check point counts match series length
    const basePoints = baseLine?.getAttribute('points')?.split(' ').filter(p => p.trim());
    const scenarioPoints = scenarioLine?.getAttribute('points')?.split(' ').filter(p => p.trim());
    
    expect(basePoints?.length).toBe(baseSeries.length);
    expect(scenarioPoints?.length).toBe(scenarioSeries.length);
  });

  it('empty series renders placeholder, not polylines', () => {
    render(
      <DeltaSparkline
        baseSeries={[]}
        scenarioSeries={[]}
        ariaLabel="Empty sparkline"
      />
    );

    const svg = screen.getByRole('img', { name: /empty sparkline/i });
    
    // No polylines when series are empty
    const polylines = svg.querySelectorAll('polyline');
    expect(polylines).toHaveLength(0);

    // Should have a placeholder rect instead
    const placeholder = svg.querySelector('rect');
    expect(placeholder).toBeInTheDocument();
  });

  it('aria-label set on svg for accessibility', () => {
    render(
      <DeltaSparkline
        baseSeries={[1, 2, 3]}
        scenarioSeries={[2, 3, 4]}
        ariaLabel="Wave attenuation over time"
      />
    );

    const svg = screen.getByRole('img', { name: /wave attenuation over time/i });
    expect(svg).toHaveAttribute('aria-label', 'Wave attenuation over time');
  });

  it('custom colors are honored', () => {
    render(
      <DeltaSparkline
        baseSeries={[10, 15, 20]}
        scenarioSeries={[12, 18, 22]}
        baseColor="#ff0000"
        scenarioColor="#00ff00"
        ariaLabel="Custom colors"
      />
    );

    const svg = screen.getByRole('img');
    const polylines = svg.querySelectorAll('polyline');

    // Base line should use custom base color
    expect(polylines[0]).toHaveAttribute('stroke', '#ff0000');
    
    // Scenario line should use custom scenario color
    expect(polylines[1]).toHaveAttribute('stroke', '#00ff00');
  });
});
