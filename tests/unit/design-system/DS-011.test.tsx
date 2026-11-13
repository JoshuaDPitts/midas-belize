import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EBINVisualizer } from '@/components/mimes/EBINVisualizer/EBINVisualizer';
import { FoodWebDiagram } from '@/components/mimes/FoodWebDiagram/FoodWebDiagram';
import { StockFlowIndicator } from '@/components/mimes/StockFlowIndicator/StockFlowIndicator';
import { BiomassChart } from '@/components/mimes/BiomassChart/BiomassChart';
import { TimeSeriesPlayer } from '@/components/mimes/TimeSeriesPlayer/TimeSeriesPlayer';
import type { EBINEntry, FoodWebGuild, TimePoint } from '@/types/mimes';

const bins: EBINEntry[] = [
  { binLabel: 'Mangrove', minDepth: -2, maxDepth: 0, ecosystemType: 'mangrove' },
  { binLabel: 'Seagrass', minDepth: 0, maxDepth: 5, ecosystemType: 'seagrass' },
  { binLabel: 'Coral', minDepth: 5, maxDepth: 20, ecosystemType: 'coral' },
];

const guilds: FoodWebGuild[] = [
  { id: 'phyto', name: 'Phytoplankton', biomass: 50, preyIds: [] },
  { id: 'zoo', name: 'Zooplankton', biomass: 30, preyIds: ['phyto'] },
  { id: 'fish', name: 'Reef Fish', biomass: 15, preyIds: ['zoo', 'phyto'] },
];

const timeData: TimePoint[] = [
  { date: '2020-01', values: { phyto: 50, zoo: 30, fish: 15 } },
  { date: '2020-06', values: { phyto: 55, zoo: 28, fish: 18 } },
  { date: '2021-01', values: { phyto: 48, zoo: 32, fish: 16 } },
];

describe('DS-011: EBINVisualizer', () => {
  it('renders an SVG with bins', () => {
    const { container } = render(<EBINVisualizer bins={bins} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a rect for each bin', () => {
    const { container } = render(<EBINVisualizer bins={bins} />);
    const rects = container.querySelectorAll('rect[data-bin]');
    expect(rects).toHaveLength(3);
  });

  it('labels ecosystem types', () => {
    render(<EBINVisualizer bins={bins} />);
    expect(screen.getByText('Mangrove')).toBeInTheDocument();
    expect(screen.getByText('Seagrass')).toBeInTheDocument();
    expect(screen.getByText('Coral')).toBeInTheDocument();
  });
});

describe('DS-011: FoodWebDiagram', () => {
  it('renders an SVG', () => {
    const { container } = render(<FoodWebDiagram guilds={guilds} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders a node for each guild', () => {
    const { container } = render(<FoodWebDiagram guilds={guilds} />);
    const nodes = container.querySelectorAll('[data-node]');
    expect(nodes).toHaveLength(3);
  });

  it('renders edges for prey relationships', () => {
    const { container } = render(<FoodWebDiagram guilds={guilds} />);
    const edges = container.querySelectorAll('line[data-edge]');
    expect(edges.length).toBeGreaterThan(0);
  });

  it('displays guild names', () => {
    render(<FoodWebDiagram guilds={guilds} />);
    expect(screen.getByText('Phytoplankton')).toBeInTheDocument();
    expect(screen.getByText('Reef Fish')).toBeInTheDocument();
  });
});

describe('DS-011: StockFlowIndicator', () => {
  it('renders label, value, and unit', () => {
    render(<StockFlowIndicator label="Biomass" value={42.5} unit="t/km²" direction="increasing" />);
    expect(screen.getByText('Biomass')).toBeInTheDocument();
    expect(screen.getByText('42.5')).toBeInTheDocument();
    expect(screen.getByText('t/km²')).toBeInTheDocument();
  });

  it('shows directional arrow', () => {
    const { container } = render(<StockFlowIndicator label="Flow" value={10} unit="m³/s" direction="decreasing" />);
    expect(container.querySelector('[data-direction]')).not.toBeNull();
  });
});

describe('DS-011: BiomassChart', () => {
  it('renders an SVG', () => {
    const { container } = render(<BiomassChart data={timeData} guildNames={['phyto', 'zoo', 'fish']} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders path elements for guild series', () => {
    const { container } = render(<BiomassChart data={timeData} guildNames={['phyto', 'zoo', 'fish']} />);
    const paths = container.querySelectorAll('path[data-series]');
    expect(paths).toHaveLength(3);
  });
});

describe('DS-011: TimeSeriesPlayer', () => {
  it('renders play/pause button and time label', () => {
    render(
      <TimeSeriesPlayer
        start="2020-01" end="2021-01" current="2020-06" step="1M"
        onTimeChange={vi.fn()} onPlayPause={vi.fn()} playing={false}
        speed={1} onSpeedChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByText('2020-06')).toBeInTheDocument();
  });

  it('fires onPlayPause when play button clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <TimeSeriesPlayer
        start="2020-01" end="2021-01" current="2020-06" step="1M"
        onTimeChange={vi.fn()} onPlayPause={handler} playing={false}
        speed={1} onSpeedChange={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('button', { name: /play/i }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('shows pause icon when playing', () => {
    render(
      <TimeSeriesPlayer
        start="2020-01" end="2021-01" current="2020-06" step="1M"
        onTimeChange={vi.fn()} onPlayPause={vi.fn()} playing={true}
        speed={1} onSpeedChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('renders a slider for scrubbing', () => {
    render(
      <TimeSeriesPlayer
        start="2020-01" end="2021-01" current="2020-06" step="1M"
        onTimeChange={vi.fn()} onPlayPause={vi.fn()} playing={false}
        speed={1} onSpeedChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });
});
