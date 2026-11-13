import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FoodWebDiagram } from '@/features/marine/domain/FoodWebDiagram';
import type { FoodWebGuild } from '@/types/mimes';

/* -----------------------------------------------------------------------
 * 16-guild fixture using real FoodWebGuild shape: { id, name, biomass, preyIds }
 * Trophic structure:
 *   Level 0 (producers / no prey): phytoplankton, seagrass, macroalgae, detritus
 *   Level 1 (herbivores / eat producers): zooplankton, urchins, herbivorous-fish, crabs
 *   Level 2 (mid-predators): small-carnivores, wrasse, snappers, lobster
 *   Level 3 (apex): large-sharks, grouper, barracuda, rays
 * ----------------------------------------------------------------------- */
const GUILDS: FoodWebGuild[] = [
  // Level 0 — producers (preyIds = [])
  { id: 'phytoplankton',   name: 'Phytoplankton',    biomass: 80,  preyIds: [] },
  { id: 'seagrass',        name: 'Seagrass',          biomass: 120, preyIds: [] },
  { id: 'macroalgae',      name: 'Macroalgae',        biomass: 60,  preyIds: [] },
  { id: 'detritus',        name: 'Detritus',          biomass: 50,  preyIds: [] },

  // Level 1 — primary consumers
  { id: 'zooplankton',     name: 'Zooplankton',       biomass: 55,  preyIds: ['phytoplankton'] },
  { id: 'urchins',         name: 'Urchins',           biomass: 40,  preyIds: ['macroalgae', 'seagrass'] },
  { id: 'herbivorous-fish',name: 'Herbivorous Fish',  biomass: 65,  preyIds: ['macroalgae', 'seagrass'] },
  { id: 'crabs',           name: 'Crabs',             biomass: 30,  preyIds: ['detritus', 'macroalgae'] },

  // Level 2 — secondary consumers
  { id: 'small-carnivores',name: 'Small Carnivores',  biomass: 45,  preyIds: ['zooplankton', 'crabs'] },
  { id: 'wrasse',          name: 'Wrasse',            biomass: 38,  preyIds: ['urchins', 'crabs'] },
  { id: 'snappers',        name: 'Snappers',          biomass: 50,  preyIds: ['herbivorous-fish', 'small-carnivores'] },
  { id: 'lobster',         name: 'Lobster',           biomass: 28,  preyIds: ['urchins', 'crabs'] },

  // Level 3 — apex
  { id: 'large-sharks',    name: 'Large Sharks',      biomass: 20,  preyIds: ['snappers', 'barracuda'] },
  { id: 'grouper',         name: 'Grouper',           biomass: 35,  preyIds: ['snappers', 'lobster', 'wrasse'] },
  { id: 'barracuda',       name: 'Barracuda',         biomass: 22,  preyIds: ['small-carnivores', 'snappers'] },
  { id: 'rays',            name: 'Rays',              biomass: 18,  preyIds: ['crabs', 'lobster'] },
];

describe('REQ-MA-006 — FoodWebDiagram', () => {
  it('renders one node per guild', () => {
    render(<FoodWebDiagram guilds={GUILDS} highlightGuildId={null} />);
    GUILDS.forEach((g) => {
      expect(screen.getByTestId(`foodweb-node-${g.id}`)).toBeInTheDocument();
    });
  });

  it('each node carries data-biomass set to the guild biomass value', () => {
    render(<FoodWebDiagram guilds={GUILDS} highlightGuildId={null} />);
    GUILDS.forEach((g) => {
      const node = screen.getByTestId(`foodweb-node-${g.id}`);
      expect(node).toHaveAttribute('data-biomass', String(g.biomass));
    });
  });

  it('when highlightGuildId is set, that node gets data-highlighted="true" and others get data-highlighted="false"', () => {
    const target = GUILDS[4]; // zooplankton
    render(<FoodWebDiagram guilds={GUILDS} highlightGuildId={target.id} />);

    const highlighted = screen.getByTestId(`foodweb-node-${target.id}`);
    expect(highlighted).toHaveAttribute('data-highlighted', 'true');

    const others = GUILDS.filter((g) => g.id !== target.id);
    others.forEach((g) => {
      expect(screen.getByTestId(`foodweb-node-${g.id}`)).toHaveAttribute(
        'data-highlighted',
        'false',
      );
    });
  });

  it('renders an empty state with data-testid="foodweb-empty" when guilds=[]', () => {
    render(<FoodWebDiagram guilds={[]} highlightGuildId={null} />);
    expect(screen.getByTestId('foodweb-empty')).toBeInTheDocument();
  });

  it('renders SVG <line> elements for each preyIds edge', () => {
    const { container } = render(
      <FoodWebDiagram guilds={GUILDS} highlightGuildId={null} />,
    );
    // Count expected edges from the fixture
    const expectedEdgeCount = GUILDS.reduce((acc, g) => acc + g.preyIds.length, 0);
    const lines = container.querySelectorAll('line[data-edge]');
    expect(lines.length).toBe(expectedEdgeCount);
  });

  it('shows figcaption with guild count', () => {
    render(<FoodWebDiagram guilds={GUILDS} highlightGuildId={null} />);
    expect(
      screen.getByText(/Food-web flow \(16 guilds\)/i),
    ).toBeInTheDocument();
  });

  it('formats fractional biomass labels without floating-point tails', () => {
    render(
      <FoodWebDiagram
        guilds={[{ id: 'floaty', name: 'Floaty', biomass: 2.4025000000000003, preyIds: [] }]}
        highlightGuildId={null}
      />,
    );
    expect(screen.getAllByText('2.4').length).toBeGreaterThan(0);
    expect(screen.queryByText(/2\.4025000000000003/)).toBeNull();
  });
});
