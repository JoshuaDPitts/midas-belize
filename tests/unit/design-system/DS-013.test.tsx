import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RadarChart } from '@/components/mimes/RadarChart/RadarChart';
import { ServiceMatrix } from '@/components/mimes/ServiceMatrix/ServiceMatrix';
import { NbSScoreCard } from '@/components/mimes/NbSScoreCard/NbSScoreCard';
import type { CoBenefit, ServiceCell, NbSScore } from '@/types/mimes';

const axes: CoBenefit[] = [
  { name: 'Carbon', value: 0.8 },
  { name: 'Biodiversity', value: 0.6 },
  { name: 'Fisheries', value: 0.9 },
  { name: 'Coastal Protection', value: 0.7 },
  { name: 'Tourism', value: 0.5 },
];

const comparison: CoBenefit[] = [
  { name: 'Carbon', value: 0.5 },
  { name: 'Biodiversity', value: 0.8 },
  { name: 'Fisheries', value: 0.4 },
  { name: 'Coastal Protection', value: 0.9 },
  { name: 'Tourism', value: 0.7 },
];

describe('DS-013: RadarChart', () => {
  it('renders an SVG', () => {
    const { container } = render(<RadarChart axes={axes} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders axis labels', () => {
    render(<RadarChart axes={axes} />);
    expect(screen.getByText('Carbon')).toBeInTheDocument();
    expect(screen.getByText('Fisheries')).toBeInTheDocument();
  });

  it('renders a filled polygon', () => {
    const { container } = render(<RadarChart axes={axes} />);
    expect(container.querySelector('polygon')).not.toBeNull();
  });

  it('renders comparison polygon when provided', () => {
    const { container } = render(<RadarChart axes={axes} comparisonAxes={comparison} labels={['MPA', 'Baseline']} />);
    const polygons = container.querySelectorAll('polygon');
    expect(polygons).toHaveLength(2);
  });
});

describe('DS-013: ServiceMatrix', () => {
  const cells: ServiceCell[] = [
    { ecosystemType: 'Coral', service: 'Fisheries', supply: 0.9 },
    { ecosystemType: 'Coral', service: 'Tourism', supply: 0.8 },
    { ecosystemType: 'Mangrove', service: 'Fisheries', supply: 0.6 },
    { ecosystemType: 'Mangrove', service: 'Tourism', supply: 0.3 },
  ];

  it('renders a table', () => {
    render(<ServiceMatrix cells={cells} ecosystemTypes={['Coral', 'Mangrove']} services={['Fisheries', 'Tourism']} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders ecosystem type row headers', () => {
    render(<ServiceMatrix cells={cells} ecosystemTypes={['Coral', 'Mangrove']} services={['Fisheries', 'Tourism']} />);
    expect(screen.getByText('Coral')).toBeInTheDocument();
    expect(screen.getByText('Mangrove')).toBeInTheDocument();
  });

  it('renders service column headers', () => {
    render(<ServiceMatrix cells={cells} ecosystemTypes={['Coral', 'Mangrove']} services={['Fisheries', 'Tourism']} />);
    expect(screen.getByText('Fisheries')).toBeInTheDocument();
    expect(screen.getByText('Tourism')).toBeInTheDocument();
  });
});

describe('DS-013: NbSScoreCard', () => {
  const score: NbSScore = {
    locationName: 'Turneffe Atoll',
    restorationPotential: 0.82,
    conservationValue: 0.71,
    combinedScore: 0.76,
  };

  it('renders location name', () => {
    render(<NbSScoreCard score={score} />);
    expect(screen.getByText('Turneffe Atoll')).toBeInTheDocument();
  });

  it('renders all three scores', () => {
    render(<NbSScoreCard score={score} />);
    expect(screen.getByText(/Restoration/)).toBeInTheDocument();
    expect(screen.getByText(/Conservation/)).toBeInTheDocument();
    expect(screen.getByText(/Combined/)).toBeInTheDocument();
  });

  it('renders bar indicators', () => {
    const { container } = render(<NbSScoreCard score={score} />);
    const bars = container.querySelectorAll('[data-bar]');
    expect(bars).toHaveLength(3);
  });
});
