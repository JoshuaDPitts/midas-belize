import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayerRow } from '@/components/layers/LayerRow/LayerRow';
import { LayerGroup } from '@/components/layers/LayerGroup/LayerGroup';
import { LayerSearch } from '@/components/layers/LayerSearch/LayerSearch';
import type { LayerConfig, LayerGroupData } from '@/types/layers';

const mockLayer: LayerConfig = {
  id: 'coral-cover',
  name: 'Coral Cover',
  domain: 'marine',
  type: 'fill',
  visible: true,
  opacity: 0.8,
  interactive: true,
  attributes: [],
};

const mockGroup: LayerGroupData = {
  domain: 'marine',
  label: 'Marine',
  layers: [mockLayer],
  expanded: true,
};

describe('DS-009: LayerRow', () => {
  it('renders layer name and domain badge', () => {
    render(<LayerRow layer={mockLayer} onToggle={vi.fn()} onOpacityChange={vi.fn()} />);
    expect(screen.getByText('Coral Cover')).toBeInTheDocument();
    expect(screen.getByText('marine')).toBeInTheDocument();
  });

  it('has eye toggle that fires onToggle', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<LayerRow layer={mockLayer} onToggle={handler} onOpacityChange={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /toggle/i }));
    expect(handler).toHaveBeenCalledWith('coral-cover', false);
  });

  it('has draggable attribute', () => {
    const { container } = render(<LayerRow layer={mockLayer} onToggle={vi.fn()} onOpacityChange={vi.fn()} />);
    expect(container.firstChild).toHaveAttribute('draggable', 'true');
  });
});

describe('DS-009: LayerGroup', () => {
  it('renders group label and children when expanded', () => {
    render(
      <LayerGroup group={mockGroup} onToggleGroup={vi.fn()}>
        <div>Child content</div>
      </LayerGroup>,
    );
    expect(screen.getByText('Marine')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('hides children when collapsed', () => {
    const collapsed = { ...mockGroup, expanded: false };
    render(
      <LayerGroup group={collapsed} onToggleGroup={vi.fn()}>
        <div>Hidden content</div>
      </LayerGroup>,
    );
    expect(screen.getByText('Marine')).toBeInTheDocument();
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
  });

  it('fires onToggleGroup on header click', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <LayerGroup group={mockGroup} onToggleGroup={handler}>
        <div>Content</div>
      </LayerGroup>,
    );
    await user.click(screen.getByText('Marine'));
    expect(handler).toHaveBeenCalledWith('marine');
  });
});

describe('DS-009: LayerSearch', () => {
  it('renders a search input', () => {
    render(<LayerSearch query="" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('fires onChange with query value', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<LayerSearch query="" onChange={handler} />);
    await user.type(screen.getByRole('textbox'), 'coral');
    expect(handler).toHaveBeenLastCalledWith('coral');
  });
});
