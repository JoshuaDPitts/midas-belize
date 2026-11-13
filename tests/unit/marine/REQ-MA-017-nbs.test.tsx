import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NbSScoreCard, computeSelectedNbsContext } from '@/features/marine/domain/NbSScoreCard';

describe('REQ-MA-017 NbSScoreCard context', () => {
  it("renders selected-polygon rank context instead of duplicating the map distribution", () => {
    render(
      <NbSScoreCard
        polygonId={17}
        restorationPotential={0.36}
        conservationValue={0.10}
        nbsScore={0.46}
        siteRange={{ min: 0.21, max: 0.71 }}
        siteScores={[0.21, 0.30, 0.46, 0.55, 0.71]}
      />,
    );
    expect(screen.getByTestId('nbs-site-rank')).toHaveTextContent('3 of 5');
    expect(screen.getByTestId('nbs-site-percentile')).toHaveTextContent(/Higher than/i);
    expect(screen.queryByTestId(/^nbs-hist-bin-/)).toBeNull();
  });

  it('does not render a histogram when siteScores is undefined', () => {
    render(
      <NbSScoreCard
        polygonId={17}
        restorationPotential={0.36}
        conservationValue={0.10}
        nbsScore={0.46}
        siteRange={{ min: 0.21, max: 0.71 }}
      />,
    );
    expect(screen.queryByTestId(/^nbs-hist-bin-/)).toBeNull();
  });

  it('computes selected-polygon rank and percentile from site scores', () => {
    expect(computeSelectedNbsContext(0.46, [0.21, 0.30, 0.46, 0.55, 0.71])).toEqual({
      rank: 3,
      total: 5,
      percentile: 60,
    });
  });
});
