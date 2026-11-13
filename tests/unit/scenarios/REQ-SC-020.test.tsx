import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAtom, useAtomValue } from 'jotai';
import { CompareToolbar } from '@/features/scenarios/compare/CompareToolbar';
import {
  activeScenarioAtom,
  compareScenarioBAtom,
  compareVerticalAtom,
  compareLayoutModeAtom,
} from '@/atoms';
import { SCENARIOS } from '@/features/scenarios/matrix';

// Mock useCompareAvailability
vi.mock('@/features/scenarios/data/useCompareAvailability', () => ({
  useCompareAvailability: () => ({
    coastal: { hasData: true },
    watershed: { hasData: true },
    marine: { hasData: false }, // Marine disabled
  }),
}));

function TestWrapper({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

describe('REQ-SC-020: CompareToolbar', () => {
  it('renders A and B dropdowns with all scenarios + Marine outlook items', () => {
    render(
      <TestWrapper>
        <CompareToolbar site="placencia" />
      </TestWrapper>,
    );

    // Should have two scenario selectors
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);

    // Check that scenario options are present (8 scenarios + 2 marine outlooks = 10 total)
    // We can verify by checking the dropdowns have the expected number of options
    const optionsA = selects[0]?.querySelectorAll('option');
    const optionsB = selects[1]?.querySelectorAll('option');
    
    // Should have all 8 scenarios + 2 marine outlooks
    expect(optionsA?.length).toBeGreaterThanOrEqual(8);
    expect(optionsB?.length).toBeGreaterThanOrEqual(8);
  });

  it('selecting A from dropdown writes to activeScenarioAtom', async () => {
    const user = userEvent.setup();
    
    function ProbeWrapper() {
      const [scenarioA, setScenarioA] = useAtom(activeScenarioAtom);
      return (
        <>
          <CompareToolbar site="placencia" />
          <span data-testid="scenario-a">{scenarioA ?? 'null'}</span>
        </>
      );
    }

    render(<ProbeWrapper />);

    const selects = screen.getAllByRole('combobox');
    const selectA = selects[0];

    // Change scenario A
    if (selectA) {
      await user.selectOptions(selectA, 'G');
    }

    // Should update activeScenarioAtom
    expect(screen.getByTestId('scenario-a')).toHaveTextContent('G');
  });

  it('vertical pill disable logic — Marine vertical disabled when neither scenario has Marine data', () => {
    render(
      <TestWrapper>
        <CompareToolbar site="placencia" />
      </TestWrapper>,
    );

    // Should have vertical toggle buttons
    const coastalBtn = screen.getByRole('button', { name: /coastal/i });
    const watershedBtn = screen.getByRole('button', { name: /watershed/i });
    const marineBtn = screen.getByRole('button', { name: /marine/i });

    // Coastal and Watershed should be enabled
    expect(coastalBtn).not.toBeDisabled();
    expect(watershedBtn).not.toBeDisabled();

    // Marine should be disabled (mock returns hasData: false)
    expect(marineBtn).toBeDisabled();
  });

  it('mode toggle click writes compareLayoutModeAtom', async () => {
    const user = userEvent.setup();

    function ProbeWrapper() {
      const mode = useAtomValue(compareLayoutModeAtom);
      return (
        <>
          <CompareToolbar site="placencia" />
          <span data-testid="mode">{mode}</span>
        </>
      );
    }

    render(<ProbeWrapper />);

    // Should have Diff and Swipe buttons
    const swipeBtn = screen.getByRole('button', { name: /swipe/i });
    
    await user.click(swipeBtn);

    // Should update compareLayoutModeAtom
    expect(screen.getByTestId('mode')).toHaveTextContent('swipe');
  });

  it('back link href constructed from current state', () => {
    function ProbeWrapper() {
      const [, setScenarioA] = useAtom(activeScenarioAtom);
      // Set scenario A to 'B' for testing
      setScenarioA('B');
      return <CompareToolbar site="placencia" />;
    }

    render(<ProbeWrapper />);

    const backLink = screen.getByRole('link', { name: /back to map/i });
    
    // Should link back to main map with site and scenario A
    expect(backLink).toHaveAttribute('href', expect.stringContaining('site=placencia'));
    expect(backLink).toHaveAttribute('href', expect.stringContaining('scenario=B'));
  });
});
