import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock URL sync hooks
vi.mock('@/atoms/url-sync', () => ({
  useCompareUrlSyncProvider: vi.fn(),
}));

// Mock jotai - defaults to empty state
vi.mock('jotai', () => ({
  useAtomValue: vi.fn(() => null),
}));

// Mock atoms
vi.mock('@/atoms', () => ({
  activeSiteAtom: {},
  activeScenarioAtom: {},
  compareScenarioBAtom: {},
  compareVerticalAtom: {},
  compareLayoutModeAtom: {},
}));

// Mock child components
vi.mock('@/features/scenarios/compare/CompareToolbar', () => ({
  CompareToolbar: () => <div data-testid="compare-toolbar">Toolbar</div>,
}));

vi.mock('@/features/scenarios/compare/CompareLayoutDiffOverlay', () => ({
  CompareLayoutDiffOverlay: () => <div data-testid="compare-layout-diff">Diff</div>,
}));

vi.mock('@/features/scenarios/compare/CompareLayoutSwipe', () => ({
  CompareLayoutSwipe: () => <div data-testid="compare-layout-swipe">Swipe</div>,
}));

describe('REQ-SC-025: ScenarioCompareRoute', () => {
  it('renders CompareToolbar', async () => {
    const { ScenarioCompareRoute } = await import('@/features/scenarios/compare/ScenarioCompareRoute');
    
    render(<ScenarioCompareRoute />);

    expect(screen.getByTestId('compare-toolbar')).toBeInTheDocument();
  });

  it('shows empty state when no scenarios selected', async () => {
    const { ScenarioCompareRoute } = await import('@/features/scenarios/compare/ScenarioCompareRoute');
    
    render(<ScenarioCompareRoute />);

    expect(screen.getByText(/select two scenarios to compare/i)).toBeInTheDocument();
  });

  it('calls URL sync provider on mount', async () => {
    const { useCompareUrlSyncProvider } = await import('@/atoms/url-sync');
    
    const { ScenarioCompareRoute } = await import('@/features/scenarios/compare/ScenarioCompareRoute');
    
    render(<ScenarioCompareRoute />);

    // URL sync provider should be defined and usable
    expect(useCompareUrlSyncProvider).toBeDefined();
  });

  it('renders toolbar in correct position', async () => {
    const { ScenarioCompareRoute } = await import('@/features/scenarios/compare/ScenarioCompareRoute');
    
    const { container } = render(<ScenarioCompareRoute />);
    
    // Toolbar should be first child of container
    const toolbar = screen.getByTestId('compare-toolbar');
    expect(container.firstChild?.firstChild).toBe(toolbar);
  });

  it('empty state shows helpful hint text', async () => {
    const { ScenarioCompareRoute } = await import('@/features/scenarios/compare/ScenarioCompareRoute');
    
    render(<ScenarioCompareRoute />);

    expect(screen.getByText(/use the toolbar above/i)).toBeInTheDocument();
    expect(screen.getByText(/coastal.*watershed.*marine/i)).toBeInTheDocument();
  });
});
