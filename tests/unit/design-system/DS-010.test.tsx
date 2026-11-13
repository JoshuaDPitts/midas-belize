import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HoverTooltip } from '@/components/layers/HoverTooltip/HoverTooltip';
import { ClickPopup } from '@/components/layers/ClickPopup/ClickPopup';
import { InspectionPanel } from '@/components/layers/InspectionPanel/InspectionPanel';
import { AttributeTable } from '@/components/layers/AttributeTable/AttributeTable';
import type { AttributeDefinition, FeatureAttributes } from '@/types/layers';

const attrs: AttributeDefinition[] = [
  { field: 'depth', label: 'Depth', unit: 'm', type: 'number' },
  { field: 'name', label: 'Name', type: 'string' },
  { field: 'cover', label: 'Cover', unit: '%', type: 'number' },
];

const feature: FeatureAttributes = { depth: 12.5, name: 'Reef A', cover: 45 };

describe('DS-010: HoverTooltip', () => {
  it('renders feature attributes at position', () => {
    render(<HoverTooltip feature={feature} attributes={attrs} position={{ x: 100, y: 200 }} />);
    expect(screen.getByText('Reef A')).toBeInTheDocument();
    expect(screen.getByText(/12\.5/)).toBeInTheDocument();
  });

  it('shows up to 3 attribute values', () => {
    render(<HoverTooltip feature={feature} attributes={attrs} position={{ x: 0, y: 0 }} />);
    expect(screen.getByText(/Depth/)).toBeInTheDocument();
    expect(screen.getByText(/Cover/)).toBeInTheDocument();
  });
});

describe('DS-010: ClickPopup', () => {
  it('renders with close button', () => {
    render(<ClickPopup feature={feature} attributes={attrs} position={{ x: 0, y: 0 }} onClose={vi.fn()} />);
    expect(screen.getByText('Reef A')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  it('fires onClose on close button click', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<ClickPopup feature={feature} attributes={attrs} position={{ x: 0, y: 0 }} onClose={handler} />);
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('DS-010: InspectionPanel', () => {
  it('renders full attribute list with labels and values', () => {
    render(<InspectionPanel feature={feature} attributes={attrs} />);
    expect(screen.getByText('Depth')).toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    expect(screen.getByText('m')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Reef A')).toBeInTheDocument();
    expect(screen.getByText('Cover')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });
});

describe('DS-010: AttributeTable', () => {
  const features: FeatureAttributes[] = [
    { depth: 12, name: 'Reef A', cover: 45 },
    { depth: 8, name: 'Reef B', cover: 60 },
  ];

  it('renders table with headers and rows', () => {
    render(<AttributeTable features={features} attributes={attrs} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    expect(screen.getAllByRole('row')).toHaveLength(3); // header + 2 data
  });

  it('uses attribute labels as headers', () => {
    render(<AttributeTable features={features} attributes={attrs} />);
    expect(screen.getByText('Depth')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Cover')).toBeInTheDocument();
  });

  it('fires onSort when header clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<AttributeTable features={features} attributes={attrs} onSort={handler} />);
    await user.click(screen.getByText('Depth'));
    expect(handler).toHaveBeenCalledWith('depth');
  });
});
