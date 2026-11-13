import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BiomassChart } from '@/features/marine/domain/BiomassChart';
import type { TimePoint } from '@/types/mimes';

/* -----------------------------------------------------------------------
 * Fixture — 6 time slices, 4 guilds.
 * Uses real TimePoint shape: { date: string; values: Record<string, number> }
 * ----------------------------------------------------------------------- */
const GUILD_NAMES = ['Phytoplankton', 'Zooplankton', 'Herbivorous Fish', 'Snappers'];

const TIME_POINTS: TimePoint[] = [
  { date: '2015', values: { Phytoplankton: 80, Zooplankton: 55, 'Herbivorous Fish': 65, Snappers: 50 } },
  { date: '2016', values: { Phytoplankton: 82, Zooplankton: 57, 'Herbivorous Fish': 67, Snappers: 52 } },
  { date: '2017', values: { Phytoplankton: 79, Zooplankton: 54, 'Herbivorous Fish': 63, Snappers: 48 } },
  { date: '2018', values: { Phytoplankton: 85, Zooplankton: 58, 'Herbivorous Fish': 70, Snappers: 55 } },
  { date: '2019', values: { Phytoplankton: 83, Zooplankton: 60, 'Herbivorous Fish': 68, Snappers: 53 } },
  { date: '2020', values: { Phytoplankton: 87, Zooplankton: 62, 'Herbivorous Fish': 72, Snappers: 57 } },
];

describe('REQ-MA-007 — BiomassChart', () => {
  it('renders an SVG with data-testid="biomass-chart"', () => {
    render(<BiomassChart data={TIME_POINTS} guildNames={GUILD_NAMES} />);
    expect(screen.getByTestId('biomass-chart')).toBeInTheDocument();
  });

  it('renders one stacked area path per guild name', () => {
    const { container } = render(
      <BiomassChart data={TIME_POINTS} guildNames={GUILD_NAMES} />,
    );
    const paths = container.querySelectorAll('path[data-series]');
    expect(paths.length).toBe(GUILD_NAMES.length);
  });

  it('each area path carries data-series matching the guild name', () => {
    const { container } = render(
      <BiomassChart data={TIME_POINTS} guildNames={GUILD_NAMES} />,
    );
    const seriesNames = Array.from(container.querySelectorAll('path[data-series]')).map(
      (el) => el.getAttribute('data-series'),
    );
    expect(seriesNames).toEqual(GUILD_NAMES);
  });

  it('returns null when data.length < 2', () => {
    const { container } = render(
      <BiomassChart data={[TIME_POINTS[0]]} guildNames={GUILD_NAMES} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('returns null when guildNames.length === 0', () => {
    const { container } = render(
      <BiomassChart data={TIME_POINTS} guildNames={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('each area path has a fill attribute referencing a gradient (url(#bc-area-N))', () => {
    const { container } = render(
      <BiomassChart data={TIME_POINTS} guildNames={GUILD_NAMES} />,
    );
    const paths = container.querySelectorAll('path[data-series]');
    paths.forEach((path, i) => {
      expect(path.getAttribute('fill')).toBe(`url(#bc-area-${i})`);
    });
  });

  it('renders a figcaption stating the guild count', () => {
    render(<BiomassChart data={TIME_POINTS} guildNames={GUILD_NAMES} />);
    expect(
      screen.getByText(new RegExp(`Biomass over time \\(${GUILD_NAMES.length} guilds\\)`, 'i')),
    ).toBeInTheDocument();
  });

  it('renders a FormulaTooltip button accessible as "Show formula for Biomass (stacked)"', () => {
    render(<BiomassChart data={TIME_POINTS} guildNames={GUILD_NAMES} />);
    expect(
      screen.getByRole('button', { name: /show formula for biomass \(stacked\)/i }),
    ).toBeInTheDocument();
  });
});
