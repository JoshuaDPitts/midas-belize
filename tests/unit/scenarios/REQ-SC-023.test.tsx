import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompareLayoutDiffOverlay } from '@/features/scenarios/compare/CompareLayoutDiffOverlay';

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

describe('REQ-SC-023: CompareLayoutDiffOverlay', () => {
  it('renders a map container with data-testid="compare-diff-map"', () => {
    render(
      <CompareLayoutDiffOverlay
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    const mapContainer = screen.getByTestId('compare-diff-map');
    expect(mapContainer).toBeInTheDocument();

    // Should contain MapView
    expect(screen.getByTestId('map-view')).toBeInTheDocument();
  });

  it('coastal vertical: renders CoastalMapLayers', () => {
    render(
      <CompareLayoutDiffOverlay
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Should render coastal map layers
    expect(screen.getByTestId('coastal-map-layers')).toBeInTheDocument();
  });

  it('watershed vertical: renders WatershedMapLayers', () => {
    render(
      <CompareLayoutDiffOverlay
        site="placencia"
        vertical="watershed"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Should render watershed map layers
    expect(screen.getByTestId('watershed-map-layers')).toBeInTheDocument();
  });

  it('marine vertical: renders empty-state message (no map)', () => {
    render(
      <CompareLayoutDiffOverlay
        site="placencia"
        vertical="marine"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Should show empty state for marine
    expect(screen.getByText(/marine comparison not yet available/i)).toBeInTheDocument();
    
    // Should NOT render map
    expect(screen.queryByTestId('map-view')).not.toBeInTheDocument();
  });
});
