import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BottomSheet } from '@/components/app-shell/BottomSheet';

describe('REQ-LS-014 — BottomSheet primitive', () => {
  it('renders children inside the body region', () => {
    render(
      <BottomSheet open onClose={() => {}}>
        <span data-testid="sheet-child">Hello</span>
      </BottomSheet>,
    );
    expect(screen.getByTestId('sheet-child')).toBeInTheDocument();
  });

  it('starts at the peek snap point', () => {
    render(
      <BottomSheet open onClose={() => {}}>
        <span />
      </BottomSheet>,
    );
    expect(screen.getByTestId('bottom-sheet')).toHaveAttribute('data-snap', 'peek');
  });

  it('clicking the drag handle toggles peek → expanded', async () => {
    const user = userEvent.setup();
    render(
      <BottomSheet open onClose={() => {}}>
        <span />
      </BottomSheet>,
    );
    await user.click(screen.getByTestId('sheet-handle'));
    expect(screen.getByTestId('bottom-sheet')).toHaveAttribute('data-snap', 'expanded');
    await user.click(screen.getByTestId('sheet-handle'));
    expect(screen.getByTestId('bottom-sheet')).toHaveAttribute('data-snap', 'peek');
  });

  it('does not render when open=false', () => {
    render(
      <BottomSheet open={false} onClose={() => {}}>
        <span data-testid="hidden-child" />
      </BottomSheet>,
    );
    expect(screen.queryByTestId('bottom-sheet')).toBeNull();
  });
});
