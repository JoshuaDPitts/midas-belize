import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormulaTooltip } from '@/components/ui/FormulaTooltip';
import { NbSScoreCard } from '@/features/marine/domain/NbSScoreCard';

describe('REQ-MA-005 — FormulaTooltip', () => {
  it('renders an info icon trigger', () => {
    render(<FormulaTooltip label="NbS Score" formula="x+y" explanation="simple sum" />);
    expect(screen.getByRole('button', { name: /formula for NbS Score/i })).toBeInTheDocument();
  });

  it('shows formula and explanation when triggered', async () => {
    const user = userEvent.setup();
    render(<FormulaTooltip label="NbS" formula="R + C" explanation="sum of R and C" />);
    await user.hover(screen.getByRole('button', { name: /formula for NbS/i }));
    expect(await screen.findByText('R + C')).toBeInTheDocument();
    expect(screen.getByText(/sum of R and C/)).toBeInTheDocument();
  });
});

describe('REQ-MA-005 — NbSScoreCard', () => {
  const sample = {
    polygonId: 7,
    restorationPotential: 0.366,
    conservationValue: 0.097,
    nbsScore: 0.463,
    siteRange: { min: 0.21, max: 0.71 },
  };

  it('displays NbS Score as the headline value', () => {
    render(<NbSScoreCard {...sample} />);
    expect(screen.getByTestId('nbs-headline')).toHaveTextContent('0.46');
  });

  it('header reads "NbS Score — Mangrove" to make scope explicit', () => {
    render(<NbSScoreCard {...sample} />);
    expect(screen.getByTestId('nbs-header')).toHaveTextContent(/NbS Score — Mangrove/);
  });

  it('exposes a formula tooltip trigger', () => {
    render(<NbSScoreCard {...sample} />);
    expect(screen.getByRole('button', { name: /formula for NbS Score/i })).toBeInTheDocument();
  });

  it('renders restoration + conservation as dual bars with correct percentages', () => {
    render(<NbSScoreCard {...sample} />);
    expect(screen.getByTestId('nbs-restoration-bar')).toHaveAttribute('aria-valuenow', '37');
    expect(screen.getByTestId('nbs-conservation-bar')).toHaveAttribute('aria-valuenow', '10');
  });

  it('uses a continuous color anchored to the site range (no tier binning)', () => {
    const { rerender } = render(<NbSScoreCard {...sample} />);
    const lowBg = screen.getByTestId('nbs-headline').style.color;
    rerender(<NbSScoreCard {...sample} nbsScore={0.71} restorationPotential={0.6} conservationValue={0.11} />);
    const highBg = screen.getByTestId('nbs-headline').style.color;
    expect(lowBg).not.toBe(highBg); // different scores → different colors
  });
});
