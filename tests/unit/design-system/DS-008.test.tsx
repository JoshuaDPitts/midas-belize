import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon, ICON_REGISTRY } from '@/lib/icons';

describe('DS-008: Iconography', () => {
  it('renders an icon from the registry', () => {
    render(<Icon name="layers" size={20} data-testid="icon" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders at 16, 20, and 24px', () => {
    const { rerender } = render(<Icon name="layers" size={16} data-testid="icon" />);
    expect(screen.getByTestId('icon')).toHaveAttribute('width', '16');
    rerender(<Icon name="layers" size={20} data-testid="icon" />);
    expect(screen.getByTestId('icon')).toHaveAttribute('width', '20');
    rerender(<Icon name="layers" size={24} data-testid="icon" />);
    expect(screen.getByTestId('icon')).toHaveAttribute('width', '24');
  });

  it('inherits color via currentColor', () => {
    render(<Icon name="layers" size={20} data-testid="icon" />);
    expect(screen.getByTestId('icon')).toHaveAttribute('stroke', 'currentColor');
  });

  it('returns null for unknown icon names', () => {
    const { container } = render(<Icon name="nonexistent" size={20} />);
    expect(container.innerHTML).toBe('');
  });

  it('has icons for all required categories', () => {
    const required = [
      'polygon', 'raster', 'point', 'line',
      'zoom-in', 'zoom-out', 'draw', 'measure', 'export',
      'menu', 'close', 'back', 'external-link',
      'watershed', 'coastal', 'marine', 'social',
    ];
    for (const name of required) {
      expect(ICON_REGISTRY, `missing icon: ${name}`).toHaveProperty(name);
    }
  });

  it('all registry entries are renderable components', () => {
    for (const name of Object.keys(ICON_REGISTRY)) {
      const { container } = render(<Icon name={name} size={20} />);
      expect(container.querySelector('svg'), `icon "${name}" did not render an SVG`).not.toBeNull();
    }
  });
});
