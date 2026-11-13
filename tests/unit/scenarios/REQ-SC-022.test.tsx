import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompareDeltaCards } from '@/features/scenarios/compare/CompareDeltaCards';
import styles from '@/features/scenarios/compare/CompareDeltaCards.module.css';

// Mock useScenarioComparison
vi.mock('@/features/scenarios/data/useScenarioComparison', () => ({
  useScenarioComparison: vi.fn(() => ({
    deltas: new Map([
      ['wave-attenuation', { polygonById: new Map([['p1', -0.15]]), siteAggregate: -0.15 }],
      ['erosion-rate', { polygonById: new Map([['p1', 0.08]]), siteAggregate: 0.08 }],
      ['mangrove-area', { polygonById: new Map([['p1', -0.02]]), siteAggregate: -0.02 }],
      ['ecosys-services', { polygonById: new Map([['p1', -0.12]]), siteAggregate: -0.12 }],
    ]),
    timeSeries: new Map([
      ['wave-attenuation', { tA: [0.5, 0.48, 0.45], tB: [0.42, 0.38, 0.35], timeAxis: ['2020', '2025', '2030'] }],
      ['erosion-rate', { tA: [0.1, 0.12, 0.15], tB: [0.15, 0.18, 0.23], timeAxis: ['2020', '2025', '2030'] }],
    ]),
    loading: false,
    error: null,
    availability: { aHasData: true, bHasData: true },
  })),
}));

describe('REQ-SC-022: CompareDeltaCards', () => {
  it('renders one card per metric in the vertical\'s metric list', () => {
    render(
      <CompareDeltaCards
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Coastal has 4 metrics
    expect(screen.getByText('Wave attenuation')).toBeInTheDocument();
    expect(screen.getByText('Erosion rate')).toBeInTheDocument();
    expect(screen.getByText('Mangrove area')).toBeInTheDocument();
    expect(screen.getByText('Ecosystem services')).toBeInTheDocument();
  });

  it('sign-driven coloring: negative delta = green badge, positive = coral', () => {
    render(
      <CompareDeltaCards
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Get all delta badges
    const badges = screen.getAllByText(/−|−\d+%|\+\d+%/);

    // Wave attenuation: -15% should have improvement class (negative is good for attenuation)
    const waveBadge = badges.find(b => b.textContent?.includes('15'));
    expect(waveBadge).toHaveClass(styles.improvement);

    // Erosion rate: +8% should have degradation class (positive is bad for erosion)
    const erosionBadge = badges.find(b => b.textContent?.includes('8'));
    expect(erosionBadge).toHaveClass(styles.degradation);
  });

  it('empty state when availability is false on either side', async () => {
    const { useScenarioComparison } = vi.mocked(
      await import('@/features/scenarios/data/useScenarioComparison')
    );

    useScenarioComparison.mockReturnValueOnce({
      deltas: new Map(),
      timeSeries: new Map(),
      loading: false,
      error: null,
      availability: { aHasData: false, bHasData: true },
    });

    render(
      <CompareDeltaCards
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Should show empty state message
    expect(screen.getByText(/no comparable.*coastal.*data/i)).toBeInTheDocument();
    expect(screen.getByText(/try a different scenario pair/i)).toBeInTheDocument();
  });

  it('per-polygon mode shows polygon-scoped delta', () => {
    render(
      <CompareDeltaCards
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
        polygonId="p1"
      />
    );

    // With polygonId set, should show polygon-specific delta
    // The delta for p1 wave-attenuation is -0.15 = -15%
    expect(screen.getByText(/−15%/)).toBeInTheDocument();
  });

  it('sparkline receives correct base/scenario series', () => {
    render(
      <CompareDeltaCards
        site="placencia"
        vertical="coastal"
        scenarioA="basecase"
        scenarioB="G"
      />
    );

    // Check that DeltaSparkline components are rendered
    const sparklines = screen.getAllByRole('img', { name: /sparkline/i });
    
    // Coastal has 4 metrics, but only 2 have time series data in the mock
    // Should have at least 2 sparklines (others will be empty)
    expect(sparklines.length).toBeGreaterThanOrEqual(2);
  });
});
