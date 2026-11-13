import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FoodWebDiagram } from '@/features/marine/domain/FoodWebDiagram';
import { Provider, createStore } from 'jotai';

// FoodWebGuild shape: { id, name, biomass, preyIds }
// (the plan example used 'label' — real type uses 'name')
function fixtureGuilds() {
  return Array.from({ length: 16 }, (_, i) => ({
    id: `g${i + 1}`,
    name: `Guild ${i + 1}`,
    biomass: i + 1,
    preyIds: i > 0 ? [`g${i}`] : [],
  }));
}

function renderDiagram() {
  const store = createStore();
  return render(
    <Provider store={store}>
      <FoodWebDiagram guilds={fixtureGuilds()} highlightGuildId={null} />
    </Provider>,
  );
}

describe('REQ-MA-017 FoodWebDiagram polish', () => {
  it('hovering a node sets data-hovered="true" on it', async () => {
    renderDiagram();
    const user = userEvent.setup();
    const node = screen.getByTestId('foodweb-node-g3');
    await user.hover(node);
    expect(node).toHaveAttribute('data-hovered', 'true');
  });

  it('shows a "View as table" toggle that reveals an aria-table', async () => {
    renderDiagram();
    const user = userEvent.setup();
    const toggle = screen.getByRole('button', { name: /view as table/i });
    await user.click(toggle);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });
});
