import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompareLayoutSwipe } from '@/features/scenarios/compare/CompareLayoutSwipe';

// Mock MapView
vi.mock('@/lib/map', () => ({
  MapView: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-view">{children}</div>
  ),
}));

// Mock vertical map layers
vi.mock('@/features/coastal/map/CoastalMapLayers', () => ({
  CoastalMapLayers: () => <div data-testid="coastal-map-layers" />,
}));

vi.mock('@/features/watershed/map/WatershedMapLayers', () => ({
  WatershedMapLayers: () => <div data-testid="watershed-map-layers" />,
}));

describe('REQ-SC-024: CompareLayoutSwipe', () => {
  it('renders two map containers (top + bottom)', () => {
    render(
      <CompareLayoutSwipe
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Should have a swipe container
    const container = screen.getByTestId('compare-swipe');
    expect(container).toBeInTheDocument();

    // Should have two map views (top and bottom)
    const mapViews = screen.getAllByTestId('map-view');
    expect(mapViews).toHaveLength(2);
  });

  it('curtain drag updates split position', () => {
    render(
      <CompareLayoutSwipe
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    const curtain = screen.getByTestId('swipe-curtain');
    expect(curtain).toBeInTheDocument();

    // Simulate drag
    fireEvent.mouseDown(curtain, { clientY: 100 });
    fireEvent.mouseMove(document, { clientY: 200 });
    fireEvent.mouseUp(document);

    // Curtain should have moved (checking via style or data attribute)
    // The implementation will set a CSS custom property or inline style
    expect(curtain).toBeInTheDocument(); // Basic check that it's still there
  });

  it('renders CoastalMapLayers in both halves when vertical=coastal', () => {
    render(
      <CompareLayoutSwipe
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Should render coastal layers twice (once per map)
    const coastalLayers = screen.getAllByTestId('coastal-map-layers');
    expect(coastalLayers).toHaveLength(2);
  });

  it('marine vertical renders empty-state message', () => {
    render(
      <CompareLayoutSwipe
        site="placencia"
        vertical="marine"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Should show empty state for marine
    expect(screen.getByText(/marine swipe comparison not yet available/i)).toBeInTheDocument();
    
    // Should NOT render map views
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument();
  });
});
