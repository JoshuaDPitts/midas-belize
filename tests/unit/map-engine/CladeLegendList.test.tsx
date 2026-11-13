import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CladeLegendList } from '@/lib/map/legends/CladeLegendList';
import { groupCladesByFamily } from '@/lib/map/core/clades';

describe('CladeLegendList', () => {
  it('renders family sections with verbatim clade names and per-clade swatches', () => {
    render(<CladeLegendList groups={groupCladesByFamily([2, 13, 14, 4])} />);

    const list = screen.getByTestId('legend-clade-list');
    // Family section headings, in legend order (forest before marine).
    expect(within(list).getByText('Forest')).toBeInTheDocument();
    expect(within(list).getByText('Marine')).toBeInTheDocument();

    // Verbatim names from ecosystem_clades.xlsx.
    expect(within(list).getByText('Open sea')).toBeInTheDocument();
    expect(within(list).getByText('Seagrass')).toBeInTheDocument();
    expect(within(list).getByText('Coral reef')).toBeInTheDocument();
    expect(within(list).getByText('Lowland broad-leaved moist forest')).toBeInTheDocument();

    // One swatch per present clade, keyed by clade id, colored from the catalog.
    const swatch13 = within(list).getByTestId('clade-swatch-13');
    expect(swatch13).toBeInTheDocument();
    expect(swatch13).toHaveStyle({ background: 'rgb(45, 95, 190)' });
  });

  it('renders nothing when there are no groups', () => {
    const { container } = render(<CladeLegendList groups={[]} />);
    expect(container.querySelector('[data-testid="legend-clade-list"]')).toBeNull();
  });
});
