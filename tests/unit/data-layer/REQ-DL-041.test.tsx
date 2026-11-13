import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';
import { DatasetOutcomesTable } from '@/app/admin/data/components/DatasetOutcomesTable';
import { useRun } from '@/app/admin/data/hooks/useRun';
import type { DatasetOutcome } from '@/lib/data/types';

const swrWrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

afterEach(() => cleanup());

describe('REQ-DL-041 — useRun hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('returns null run + loading=false when runId is null', () => {
    const { result } = renderHook(() => useRun(null), { wrapper: swrWrapper });
    expect(result.current.run).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fetches /api/ops/runs/{id} and returns the run', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ run: { id: 'run-1', status: 'success', triggered_by: 'schedule' } }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { result } = renderHook(() => useRun('run-1'), { wrapper: swrWrapper });
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.run?.id).toBe('run-1');
    expect(global.fetch).toHaveBeenCalledWith('/api/ops/runs/run-1');
  });

  it('URL-encodes the run id', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ run: { id: 'a/b' } }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    renderHook(() => useRun('a/b'), { wrapper: swrWrapper });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith('/api/ops/runs/a%2Fb');
  });
});

function makeOutcome(over: Partial<DatasetOutcome> & { dataset_id: string }): DatasetOutcome {
  return {
    dataset_id: over.dataset_id,
    version_before:
      'version_before' in over ? over.version_before : 'v2026-04-25-aaa1111',
    version_after:
      'version_after' in over ? over.version_after : 'v2026-04-26-bbb2222',
    status: over.status ?? 'published',
    reason: over.reason,
    duration_ms: over.duration_ms ?? 1500,
  };
}

describe('REQ-DL-041 — DatasetOutcomesTable', () => {
  it('renders an empty-state when outcomes is empty', () => {
    const { container } = render(<DatasetOutcomesTable outcomes={[]} />);
    expect(container.querySelector('[data-empty-outcomes]')).not.toBeNull();
  });

  it('renders one row per outcome with status data attribute', () => {
    const outcomes = [
      makeOutcome({ dataset_id: 'ds-1', status: 'published' }),
      makeOutcome({ dataset_id: 'ds-2', status: 'failed', reason: 'CSV parse error at row 14' }),
      makeOutcome({ dataset_id: 'ds-3', status: 'skipped-nochange' }),
      makeOutcome({ dataset_id: 'ds-4', status: 'blocked-drift', reason: 'Column "X" missing' }),
      makeOutcome({ dataset_id: 'ds-5', status: 'blocked-provenance' }),
    ];
    const { container } = render(<DatasetOutcomesTable outcomes={outcomes} />);
    const rows = container.querySelectorAll('[data-outcome]');
    expect(rows.length).toBe(5);
    expect(Array.from(rows).map((r) => r.getAttribute('data-status'))).toEqual([
      'published',
      'failed',
      'skipped-nochange',
      'blocked-drift',
      'blocked-provenance',
    ]);
  });

  it('failed outcome with reason renders a Show reason toggle that reveals the reason', async () => {
    const user = userEvent.setup();
    const outcomes = [
      makeOutcome({
        dataset_id: 'ds-failed',
        status: 'failed',
        reason: 'Schema mismatch — Polygon_ID type drift',
      }),
    ];
    const { container } = render(<DatasetOutcomesTable outcomes={outcomes} />);
    expect(container.querySelector('[data-reason]')).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Show reason' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(container.querySelector('[data-reason]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Hide reason' })).toBeInTheDocument();
    expect(screen.getByText(/Polygon_ID type drift/)).toBeInTheDocument();
  });

  it('non-failure outcome with a reason renders the reason inline (no toggle)', () => {
    const outcomes = [
      makeOutcome({
        dataset_id: 'ds-skip',
        status: 'skipped-nochange',
        reason: 'content hash unchanged',
      }),
    ];
    const { container } = render(<DatasetOutcomesTable outcomes={outcomes} />);
    expect(screen.queryByRole('button', { name: /reason/i })).toBeNull();
    expect(container.querySelector('[data-reason]')).not.toBeNull();
    expect(screen.getByText('content hash unchanged')).toBeInTheDocument();
  });

  it('links the dataset id to the dataset detail route', () => {
    const outcomes = [makeOutcome({ dataset_id: 'placencia-coast', status: 'published' })];
    render(<DatasetOutcomesTable outcomes={outcomes} />);
    expect(screen.getByRole('link', { name: 'placencia-coast' })).toHaveAttribute(
      'href',
      '/admin/data/dataset/placencia-coast',
    );
  });

  it('formats the version transition with a → arrow', () => {
    const outcomes = [
      makeOutcome({
        dataset_id: 'ds-1',
        version_before: 'v2026-04-22-aaa',
        version_after: 'v2026-04-25-bbb',
        status: 'published',
      }),
    ];
    render(<DatasetOutcomesTable outcomes={outcomes} />);
    expect(screen.getByText('v2026-04-22-aaa')).toBeInTheDocument();
    expect(screen.getByText('v2026-04-25-bbb')).toBeInTheDocument();
  });

  it('renders em-dash for missing version_before / version_after', () => {
    const outcomes = [
      makeOutcome({
        dataset_id: 'ds-new',
        version_before: undefined,
        version_after: 'v2026-04-26-aaa',
        status: 'published',
      }),
    ];
    const { container } = render(<DatasetOutcomesTable outcomes={outcomes} />);
    const fragments = container.querySelectorAll('code');
    const fragmentTexts = Array.from(fragments).map((c) => c.textContent);
    expect(fragmentTexts).toContain('—');
    expect(fragmentTexts).toContain('v2026-04-26-aaa');
  });

  it('formats duration in ms when sub-1s, s otherwise', () => {
    const outcomes = [
      makeOutcome({ dataset_id: 'ds-fast', duration_ms: 850, status: 'published' }),
      makeOutcome({ dataset_id: 'ds-slow', duration_ms: 4_500, status: 'published' }),
    ];
    render(<DatasetOutcomesTable outcomes={outcomes} />);
    expect(screen.getByText('850ms')).toBeInTheDocument();
    expect(screen.getByText('4.5s')).toBeInTheDocument();
  });
});
