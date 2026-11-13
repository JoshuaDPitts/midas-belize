import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BiomassChart } from '@/features/marine/domain/BiomassChart';

const sampleData = [
  { date: '2017', values: { 'Guild A': 10, 'Guild B': 5 } },
  { date: '2018', values: { 'Guild A': 12, 'Guild B': 7 } },
  { date: '2019', values: { 'Guild A': 14, 'Guild B': 6 } },
];

describe('REQ-MA-017 BiomassChart polish', () => {
  it('clicking a legend chip toggles the corresponding stack visibility', async () => {
    render(<BiomassChart data={sampleData} guildNames={['Guild A', 'Guild B']} />);
    const user = userEvent.setup();
    const chip = screen.getByTestId('biomass-legend-Guild A');
    await user.click(chip);
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('biomass-stack-Guild A')).toHaveAttribute('data-hidden', 'true');
  });
});
