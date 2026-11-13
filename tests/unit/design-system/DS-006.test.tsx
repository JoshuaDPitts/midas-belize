import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FloatingToolbar } from '@/components/map/FloatingToolbar/FloatingToolbar';
import { AttributionBar } from '@/components/map/AttributionBar/AttributionBar';
import { CoordinateDisplay } from '@/components/map/CoordinateDisplay/CoordinateDisplay';
import { ZoomControls } from '@/components/map/ZoomControls/ZoomControls';

describe('DS-006: FloatingToolbar', () => {
  it('renders action buttons', () => {
    const actions = [
      { name: 'draw', icon: 'draw', onClick: vi.fn() },
      { name: 'measure', icon: 'measure', onClick: vi.fn() },
    ];
    render(<FloatingToolbar actions={actions} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('highlights active action', () => {
    const actions = [
      { name: 'draw', icon: 'draw', onClick: vi.fn(), active: true },
      { name: 'measure', icon: 'measure', onClick: vi.fn() },
    ];
    render(<FloatingToolbar actions={actions} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAttribute('data-active', 'true');
    expect(buttons[1]).toHaveAttribute('data-active', 'false');
  });

  it('fires onClick when action clicked', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    const actions = [{ name: 'draw', icon: 'draw', onClick: handler }];
    render(<FloatingToolbar actions={actions} />);
    await user.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('DS-006: AttributionBar', () => {
  it('renders attribution text', () => {
    render(<AttributionBar text="© OpenStreetMap contributors" />);
    expect(screen.getByText('© OpenStreetMap contributors')).toBeInTheDocument();
  });
});

describe('DS-006: CoordinateDisplay', () => {
  it('formats coordinates to 5 decimal places', () => {
    render(<CoordinateDisplay lat={17.123456789} lon={-88.987654321} />);
    expect(screen.getByText(/17\.12346/)).toBeInTheDocument();
    expect(screen.getByText(/-88\.98765/)).toBeInTheDocument();
  });
});

describe('DS-006: ZoomControls', () => {
  it('renders zoom level and buttons', () => {
    render(<ZoomControls zoom={10} onZoomIn={vi.fn()} onZoomOut={vi.fn()} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('fires onZoomIn and onZoomOut', async () => {
    const user = userEvent.setup();
    const zoomIn = vi.fn();
    const zoomOut = vi.fn();
    render(<ZoomControls zoom={10} onZoomIn={zoomIn} onZoomOut={zoomOut} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(zoomIn).toHaveBeenCalledOnce();
    await user.click(buttons[1]);
    expect(zoomOut).toHaveBeenCalledOnce();
  });
});
