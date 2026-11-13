import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GraduatedLegend } from '@/components/data/GraduatedLegend/GraduatedLegend';
import { CategoricalLegend } from '@/components/data/CategoricalLegend/CategoricalLegend';
import { DataCard } from '@/components/data/DataCard/DataCard';
import { StatDisplay } from '@/components/data/StatDisplay/StatDisplay';
import { Sparkline } from '@/components/data/Sparkline/Sparkline';
import { LoadingState } from '@/components/data/LoadingState/LoadingState';

describe('DS-005: GraduatedLegend', () => {
  it('renders color ramp with min/max labels', () => {
    render(
      <GraduatedLegend breaks={[0, 25, 50, 75, 100]} colors={['#f00', '#ff0', '#0f0', '#0ff']} label="Depth" unit="m" />,
    );
    expect(screen.getByText('Depth')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders correct number of color segments', () => {
    const { container } = render(
      <GraduatedLegend breaks={[0, 50, 100]} colors={['#f00', '#0f0']} label="Test" />,
    );
    const segments = container.querySelectorAll('[data-segment]');
    expect(segments).toHaveLength(2);
  });
});

describe('DS-005: CategoricalLegend', () => {
  it('renders swatches with labels', () => {
    render(
      <CategoricalLegend
        categories={[
          { label: 'Coral', color: '#ff6b6b' },
          { label: 'Seagrass', color: '#51cf66' },
        ]}
        label="Habitat"
      />,
    );
    expect(screen.getByText('Habitat')).toBeInTheDocument();
    expect(screen.getByText('Coral')).toBeInTheDocument();
    expect(screen.getByText('Seagrass')).toBeInTheDocument();
  });

  it('renders correct number of swatches', () => {
    const { container } = render(
      <CategoricalLegend
        categories={[
          { label: 'A', color: '#f00' },
          { label: 'B', color: '#0f0' },
          { label: 'C', color: '#00f' },
        ]}
        label="Types"
      />,
    );
    const swatches = container.querySelectorAll('[data-swatch]');
    expect(swatches).toHaveLength(3);
  });
});

describe('DS-005: DataCard', () => {
  it('renders label and value', () => {
    render(<DataCard label="Biomass" value={42.5} unit="kg/m²" />);
    expect(screen.getByText('Biomass')).toBeInTheDocument();
    expect(screen.getByText('42.5')).toBeInTheDocument();
    expect(screen.getByText('kg/m²')).toBeInTheDocument();
  });

  it('shows trend indicator when provided', () => {
    render(<DataCard label="Flow" value={100} trend="increasing" />);
    expect(screen.getByTestId('trend-indicator')).toBeInTheDocument();
  });

  it('renders without trend when not provided', () => {
    render(<DataCard label="Static" value={0} />);
    expect(screen.queryByTestId('trend-indicator')).not.toBeInTheDocument();
  });
});

describe('DS-005: StatDisplay', () => {
  it('renders label and large value', () => {
    render(<StatDisplay label="Total Area" value="1,234" unit="km²" />);
    expect(screen.getByText('Total Area')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('km²')).toBeInTheDocument();
  });

  it('shows colored delta when provided', () => {
    const { container } = render(<StatDisplay label="Change" value={50} delta={12.5} />);
    const delta = container.querySelector('[data-delta]');
    expect(delta).not.toBeNull();
    expect(delta!.textContent).toContain('12.5');
  });

  it('shows negative delta', () => {
    const { container } = render(<StatDisplay label="Decline" value={30} delta={-8} />);
    const delta = container.querySelector('[data-delta]');
    expect(delta!.textContent).toContain('-8');
  });
});

describe('DS-005: Sparkline', () => {
  it('renders an SVG polyline', () => {
    const { container } = render(<Sparkline data={[10, 20, 15, 25, 18]} data-testid="spark" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('polyline')).not.toBeNull();
  });

  it('accepts custom dimensions', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} width={120} height={30} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '30');
  });
});

describe('DS-005: LoadingState', () => {
  it('renders a skeleton element', () => {
    const { container } = render(<LoadingState data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it('accepts custom dimensions', () => {
    render(<LoadingState width={200} height={24} data-testid="sized" />);
    const el = screen.getByTestId('sized');
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('24px');
  });
});
