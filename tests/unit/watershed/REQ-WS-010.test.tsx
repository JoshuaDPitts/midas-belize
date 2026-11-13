import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { watershedEncodingAtom } from '@/atoms';
import { WatershedEncoderPicker } from '@/features/watershed/map/WatershedEncoderPicker';
import { WatershedLegend } from '@/features/watershed/map/WatershedLegend';

function renderWith(node: React.ReactNode, opts: { encoding?: 'nbs' | 'clade' | 'restoration' | 'erosion-risk' } = {}) {
  const store = createStore();
  if (opts.encoding) store.set(watershedEncodingAtom, opts.encoding);
  return {
    store,
    ...render(<Provider store={store}>{node}</Provider>),
  };
}

describe('REQ-WS-010: WatershedEncoderPicker', () => {
  it('renders 4 pills in NbS / Clade / Restoration / Erosion Risk order', () => {
    renderWith(<WatershedEncoderPicker />);
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.textContent?.trim())).toEqual([
      'NbS',
      'Clade',
      'Restoration',
      'Erosion Risk',
    ]);
  });

  it('marks NbS as checked by default', () => {
    renderWith(<WatershedEncoderPicker />);
    const nbs = screen.getByRole('radio', { name: 'NbS' });
    expect(nbs).toHaveAttribute('aria-checked', 'true');
  });

  it('clicking Clade updates watershedEncodingAtom', async () => {
    const user = userEvent.setup();
    const { store } = renderWith(<WatershedEncoderPicker />);
    await user.click(screen.getByRole('radio', { name: 'Clade' }));
    expect(store.get(watershedEncodingAtom)).toBe('clade');
  });

  it('clicking Erosion Risk updates the atom', async () => {
    const user = userEvent.setup();
    const { store } = renderWith(<WatershedEncoderPicker />);
    await user.click(screen.getByRole('radio', { name: 'Erosion Risk' }));
    expect(store.get(watershedEncodingAtom)).toBe('erosion-risk');
  });
});

describe('REQ-WS-010: WatershedLegend', () => {
  it('renders the NbS diverging gradient when encoding is nbs', () => {
    renderWith(<WatershedLegend />, { encoding: 'nbs' });
    expect(screen.getByTestId('watershed-legend')).toHaveTextContent(/NbS/i);
    expect(screen.getByTestId('watershed-legend-gradient')).toBeInTheDocument();
    expect(screen.getByTestId('watershed-legend-min')).toHaveTextContent('-1');
    expect(screen.getByTestId('watershed-legend-max')).toHaveTextContent('+1');
  });

  it('renders the named, family-grouped clade list when encoding is clade', () => {
    renderWith(<WatershedLegend />, { encoding: 'clade' });
    const legend = screen.getByTestId('watershed-legend');
    expect(legend).toHaveTextContent(/Dominant clade/i);
    // With no active site the legend falls back to the full 25-clade reference.
    expect(within(legend).getByText('Forest')).toBeInTheDocument();
    expect(within(legend).getByText('Open sea')).toBeInTheDocument();
    const swatches = within(legend).getAllByTestId(/clade-swatch-/);
    expect(swatches.length).toBe(25);
  });

  it('renders the Restoration ramp when encoding is restoration', () => {
    renderWith(<WatershedLegend />, { encoding: 'restoration' });
    expect(screen.getByTestId('watershed-legend')).toHaveTextContent(/Restoration/i);
    expect(screen.getByTestId('watershed-legend-min')).toHaveTextContent(/Low/i);
    expect(screen.getByTestId('watershed-legend-max')).toHaveTextContent(/High/i);
  });

  it('renders the Erosion Risk ramp when encoding is erosion-risk', () => {
    renderWith(<WatershedLegend />, { encoding: 'erosion-risk' });
    expect(screen.getByTestId('watershed-legend')).toHaveTextContent(/Erosion risk/i);
    expect(screen.getByTestId('watershed-legend-min')).toHaveTextContent(/Low/i);
    expect(screen.getByTestId('watershed-legend-max')).toHaveTextContent(/High/i);
  });
});
