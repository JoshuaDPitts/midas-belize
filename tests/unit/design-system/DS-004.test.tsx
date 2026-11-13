import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button/Button';
import { Toggle } from '@/components/ui/Toggle/Toggle';
import { TextInput } from '@/components/ui/TextInput/TextInput';
import { Select } from '@/components/ui/Select/Select';
import { Dropdown } from '@/components/ui/Dropdown/Dropdown';
import { Tooltip } from '@/components/ui/Tooltip/Tooltip';
import { Modal } from '@/components/ui/Modal/Modal';
import { Slider } from '@/components/ui/Slider/Slider';

describe('DS-004: Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('supports all variants', () => {
    const { rerender } = render(<Button variant="primary">Btn</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary');
    rerender(<Button variant="secondary">Btn</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'secondary');
    rerender(<Button variant="ghost">Btn</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'ghost');
    rerender(<Button variant="icon" aria-label="action">Btn</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'icon');
  });

  it('defaults to primary variant', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('data-variant', 'primary');
  });

  it('supports disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is keyboard-navigable', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Button onClick={handler}>Press</Button>);
    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('passes through additional HTML attributes', () => {
    render(<Button data-testid="custom" id="btn-1">Test</Button>);
    expect(screen.getByTestId('custom')).toHaveAttribute('id', 'btn-1');
  });
});

describe('DS-004: Toggle', () => {
  it('renders with label and switch role', () => {
    render(<Toggle label="Show layer" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByText('Show layer')).toBeInTheDocument();
  });

  it('toggles on click', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Toggle label="Toggle" checked={false} onChange={handler} />);
    await user.click(screen.getByRole('switch'));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it('reflects checked state', () => {
    render(<Toggle label="On" checked={true} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('reflects unchecked state', () => {
    render(<Toggle label="Off" checked={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('supports disabled state', () => {
    render(<Toggle label="Disabled" checked={false} onChange={() => {}} disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});

describe('DS-004: Slider', () => {
  it('renders with aria attributes', () => {
    render(<Slider min={0} max={100} value={50} onChange={() => {}} label="Opacity" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays label', () => {
    render(<Slider min={0} max={100} value={50} onChange={() => {}} label="Opacity" />);
    expect(screen.getByText('Opacity')).toBeInTheDocument();
  });

  it('fires onChange on input', () => {
    const handler = vi.fn();
    render(<Slider min={0} max={100} value={50} onChange={handler} label="Opacity" />);
    const slider = screen.getByRole('slider');
    // jsdom doesn't support keyboard-driven range input changes, use fireEvent
    fireEvent.change(slider, { target: { value: '75' } });
    expect(handler).toHaveBeenCalledWith(75);
  });

  it('supports disabled state', () => {
    render(<Slider min={0} max={100} value={50} onChange={() => {}} disabled />);
    expect(screen.getByRole('slider')).toBeDisabled();
  });
});

describe('DS-004: TextInput', () => {
  it('renders with label and placeholder', () => {
    render(<TextInput label="Name" placeholder="Enter name" onChange={() => {}} />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
  });

  it('fires onChange with value', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<TextInput label="Name" placeholder="Type" onChange={handler} />);
    await user.type(screen.getByRole('textbox'), 'hello');
    expect(handler).toHaveBeenLastCalledWith('hello');
  });

  it('supports disabled state', () => {
    render(<TextInput label="Name" placeholder="Disabled" onChange={() => {}} disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});

describe('DS-004: Select', () => {
  const options = [
    { value: 'a', label: 'Alpha' },
    { value: 'b', label: 'Beta' },
    { value: 'c', label: 'Gamma' },
  ];

  it('renders all options', () => {
    render(<Select options={options} value="a" onChange={() => {}} label="Pick" />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('fires onChange with selected value', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Select options={options} value="a" onChange={handler} label="Pick" />);
    await user.selectOptions(screen.getByRole('combobox'), 'b');
    expect(handler).toHaveBeenCalledWith('b');
  });

  it('supports disabled state', () => {
    render(<Select options={options} value="a" onChange={() => {}} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});

describe('DS-004: Dropdown', () => {
  const items = [
    { label: 'Edit', onClick: vi.fn() },
    { label: 'Delete', onClick: vi.fn() },
  ];

  it('opens on trigger click', async () => {
    const user = userEvent.setup();
    render(<Dropdown trigger={<button>Menu</button>} items={items} />);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    await user.click(screen.getByText('Menu'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    render(<Dropdown trigger={<button>Menu</button>} items={items} />);
    await user.click(screen.getByText('Menu'));
    expect(screen.getByText('Edit')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('fires item onClick and closes', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    const testItems = [{ label: 'Action', onClick: handler }];
    render(<Dropdown trigger={<button>Menu</button>} items={testItems} />);
    await user.click(screen.getByText('Menu'));
    await user.click(screen.getByText('Action'));
    expect(handler).toHaveBeenCalledOnce();
    expect(screen.queryByText('Action')).not.toBeInTheDocument();
  });
});

describe('DS-004: Tooltip', () => {
  it('shows content on hover', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>,
    );
    expect(screen.queryByText('Help text')).not.toBeInTheDocument();
    await user.hover(screen.getByText('Hover me'));
    expect(screen.getByText('Help text')).toBeInTheDocument();
  });

  it('hides content on mouse leave', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>,
    );
    await user.hover(screen.getByText('Hover me'));
    expect(screen.getByText('Help text')).toBeInTheDocument();
    await user.unhover(screen.getByText('Hover me'));
    expect(screen.queryByText('Help text')).not.toBeInTheDocument();
  });
});

describe('DS-004: Modal', () => {
  it('renders content when open', () => {
    render(
      <Modal open onClose={() => {}} title="Confirm">
        <p>Are you sure?</p>
      </Modal>,
    );
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        <p>Nope</p>
      </Modal>,
    );
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('fires onClose on Escape', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <Modal open onClose={handler} title="Dialog">
        <p>Content</p>
      </Modal>,
    );
    await user.keyboard('{Escape}');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('fires onClose on close button click', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <Modal open onClose={handler} title="Dialog">
        <p>Content</p>
      </Modal>,
    );
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(handler).toHaveBeenCalledOnce();
  });
});
