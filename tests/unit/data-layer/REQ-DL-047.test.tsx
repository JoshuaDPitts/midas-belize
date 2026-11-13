import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import { Toast } from '@/app/admin/data/components/Toast';
import { useRunPolling } from '@/app/admin/data/hooks/useRunPolling';

const swrWrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('REQ-DL-047 — useRunPolling hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('returns idle when runId is null and does not fetch', () => {
    const { result } = renderHook(() => useRunPolling(null), { wrapper: swrWrapper });
    expect(result.current.status).toBe('idle');
    expect(result.current.run).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns success when the underlying run reports success', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          run: {
            id: 'r-success',
            status: 'success',
            triggered_by: 'dataset-rerun',
            summary: { datasets_total: 1, datasets_published: 1 },
            dataset_outcomes: [],
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { result } = renderHook(() => useRunPolling('r-success'), {
      wrapper: swrWrapper,
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.run?.id).toBe('r-success');
  });

  it('returns failed when the underlying run reports failed', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          run: {
            id: 'r-failed',
            status: 'failed',
            triggered_by: 'dataset-rerun',
            summary: {},
            dataset_outcomes: [],
            error_summary: 'GHA workflow failed',
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { result } = renderHook(() => useRunPolling('r-failed'), {
      wrapper: swrWrapper,
    });
    await waitFor(() => expect(result.current.status).toBe('failed'));
  });

  it('flips to timed-out after the timeout window when the run is still non-terminal', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          run: {
            id: 'r-running',
            status: 'running',
            triggered_by: 'dataset-rerun',
            summary: {},
            dataset_outcomes: [],
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
    // Use a tiny real timeout so the assertion uses real time but the test
    // still finishes quickly. Faking setTimeout caused the testing-library
    // poll loop to wedge.
    const { result } = renderHook(
      () => useRunPolling('r-running', { timeoutMs: 50 }),
      { wrapper: swrWrapper },
    );
    await waitFor(() => expect(result.current.status).toBe('running'));
    await waitFor(() => expect(result.current.status).toBe('timed-out'), {
      timeout: 1000,
    });
  });
});

describe('REQ-DL-047 — Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('renders message + variant data attribute', () => {
    render(
      <Toast variant="success" message="Rerun completed" onDismiss={() => undefined} />,
    );
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('data-variant', 'success');
    expect(toast).toHaveTextContent('Rerun completed');
  });

  it('renders an action link when provided', () => {
    render(
      <Toast
        variant="success"
        message="Done"
        action={{ label: 'View run', href: '/admin/data/runs/r1' }}
        onDismiss={() => undefined}
      />,
    );
    const link = screen.getByRole('link', { name: /View run/ });
    expect(link).toHaveAttribute('href', '/admin/data/runs/r1');
  });

  it('auto-dismisses after the specified duration', () => {
    const onDismiss = vi.fn();
    render(
      <Toast
        variant="info"
        message="hi"
        duration={3000}
        onDismiss={onDismiss}
      />,
    );
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(3000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('disables auto-dismiss when duration is 0 + still allows manual close', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <Toast
        variant="info"
        message="persistent"
        duration={0}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
