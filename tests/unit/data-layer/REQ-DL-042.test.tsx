import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor, renderHook } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { DriftQueue, type DriftTicket } from '@/app/admin/data/components/DriftQueue';
import { useDrift } from '@/app/admin/data/hooks/useDrift';
import type { SchemaDrift } from '@/lib/data/types';

const FIXED_NOW = Date.parse('2026-04-26T12:00:00Z');
const HOUR = 3600 * 1000;

const swrWrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

function makeTicket(over: Partial<DriftTicket> & { id: string }): DriftTicket {
  const detectedSec = Math.floor((FIXED_NOW - 2 * HOUR) / 1000);
  return {
    id: over.id,
    schema_id: over.schema_id ?? 'mimes-polygon-detail',
    current_schema_version: over.current_schema_version ?? 1,
    detected_at: over.detected_at ?? ({ _seconds: detectedSec } as never),
    first_seen_in_run: over.first_seen_in_run ?? 'sched-1745552500-aaa',
    last_seen_in_run: over.last_seen_in_run ?? 'sched-1745623200-bbb',
    occurrence_count: over.occurrence_count ?? 1,
    diff: over.diff ?? {
      missing_required: [],
      added_unknown: [],
      renamed_candidates: [],
      dropped_dynamic: [],
    },
    affected_datasets: over.affected_datasets ?? ['placencia-coast-ebin-clade-detail'],
    sample_rows: over.sample_rows ?? [],
    source_file_path: over.source_file_path ?? 'raw/MIMES_MIDAS/Pl_Coast.csv',
    status: over.status ?? 'open',
    resolved_at: over.resolved_at,
    resolved_by: over.resolved_by,
    resolution_commit_sha: over.resolution_commit_sha,
    resolution_notes: over.resolution_notes,
  };
}

afterEach(() => cleanup());

describe('REQ-DL-042 — useDrift hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('defaults to status=open', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ drift: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { result } = renderHook(() => useDrift(), { wrapper: swrWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith('/api/ops/drift?status=open');
  });

  it('honours an explicit status filter', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ drift: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    renderHook(() => useDrift({ status: 'accepted' }), { wrapper: swrWrapper });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith('/api/ops/drift?status=accepted');
  });

  it('returns the drift array from the response payload', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          drift: [
            {
              id: 'd-1',
              schema_id: 'x',
              current_schema_version: 1,
              detected_at: { _seconds: 1 },
              first_seen_in_run: 'r-1',
              last_seen_in_run: 'r-1',
              occurrence_count: 1,
              diff: {
                missing_required: [],
                added_unknown: [],
                renamed_candidates: [],
                dropped_dynamic: [],
              },
              affected_datasets: [],
              sample_rows: [],
              source_file_path: 'raw/x.csv',
              status: 'open',
            },
          ],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const { result } = renderHook(() => useDrift({ status: 'open' }), {
      wrapper: swrWrapper,
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickets.map((t) => t.id)).toEqual(['d-1']);
  });
});

describe('REQ-DL-042 — DriftQueue', () => {
  it('renders the empty state when there are no tickets', () => {
    const { container } = render(<DriftQueue tickets={[]} now={FIXED_NOW} />);
    expect(container.querySelector('[data-empty-drift]')).not.toBeNull();
  });

  it('renders the loading state when loading + no tickets', () => {
    const { container } = render(<DriftQueue tickets={[]} loading now={FIXED_NOW} />);
    expect(container.querySelector('[data-loading]')).not.toBeNull();
  });

  it('renders one card per ticket with [data-status]', () => {
    const tickets = [
      makeTicket({ id: 'd-1', status: 'open' }),
      makeTicket({ id: 'd-2', status: 'accepted' }),
      makeTicket({ id: 'd-3', status: 'rejected' }),
    ];
    const { container } = render(<DriftQueue tickets={tickets} now={FIXED_NOW} />);
    const cards = container.querySelectorAll('[data-drift]');
    expect(cards.length).toBe(3);
    expect(Array.from(cards).map((c) => c.getAttribute('data-status'))).toEqual([
      'open',
      'accepted',
      'rejected',
    ]);
  });

  it('shows missing-required diff section when missing_required is non-empty', () => {
    const tickets = [
      makeTicket({
        id: 'd-1',
        diff: {
          missing_required: ['Polygon_ID', 'BIN_Label'],
          added_unknown: [],
          renamed_candidates: [],
          dropped_dynamic: [],
        },
      }),
    ];
    const { container } = render(<DriftQueue tickets={tickets} now={FIXED_NOW} />);
    expect(container.querySelector('[data-diff-missing]')).not.toBeNull();
    expect(screen.getByText('Polygon_ID')).toBeInTheDocument();
    expect(screen.getByText('BIN_Label')).toBeInTheDocument();
    expect(container.querySelector('[data-diff-added]')).toBeNull();
    expect(container.querySelector('[data-diff-renames]')).toBeNull();
  });

  it('shows added-unknown diff section', () => {
    const tickets = [
      makeTicket({
        id: 'd-1',
        diff: {
          missing_required: [],
          added_unknown: ['New_Column_42'],
          renamed_candidates: [],
          dropped_dynamic: [],
        },
      }),
    ];
    const { container } = render(<DriftQueue tickets={tickets} now={FIXED_NOW} />);
    expect(container.querySelector('[data-diff-added]')).not.toBeNull();
    expect(screen.getByText('New_Column_42')).toBeInTheDocument();
  });

  it('renders rename pairs with confidence percentage', () => {
    const tickets = [
      makeTicket({
        id: 'd-1',
        diff: {
          missing_required: [],
          added_unknown: [],
          renamed_candidates: [{ from: 'Polygon_ID', to: 'PolygonId', confidence: 0.87 }],
          dropped_dynamic: [],
        },
      }),
    ];
    const { container } = render(<DriftQueue tickets={tickets} now={FIXED_NOW} />);
    expect(container.querySelector('[data-diff-renames]')).not.toBeNull();
    expect(screen.getByText('Polygon_ID')).toBeInTheDocument();
    expect(screen.getByText('PolygonId')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('shows occurrence count + first-run link', () => {
    const tickets = [
      makeTicket({
        id: 'd-1',
        occurrence_count: 12,
        first_seen_in_run: 'sched-2026-04-20-aaa',
      }),
    ];
    render(<DriftQueue tickets={tickets} now={FIXED_NOW} />);
    expect(screen.getByText('Seen 12×')).toBeInTheDocument();
    const runLink = screen.getByRole('link', { name: 'sched-2026-04-20-aaa' });
    expect(runLink).toHaveAttribute('href', '/admin/data/runs/sched-2026-04-20-aaa');
  });

  it('links the Review button to the drift detail route', () => {
    const tickets = [makeTicket({ id: 'drift-aabbcc' })];
    render(<DriftQueue tickets={tickets} now={FIXED_NOW} />);
    expect(
      screen.getByRole('link', { name: /Review/ }),
    ).toHaveAttribute('href', '/admin/data/drift/drift-aabbcc');
  });

  it('formats the affected-datasets count with singular/plural', () => {
    const one = [makeTicket({ id: 'd-1', affected_datasets: ['ds-a'] })];
    const { rerender } = render(<DriftQueue tickets={one} now={FIXED_NOW} />);
    expect(screen.getByText(/Affects 1 dataset$/)).toBeInTheDocument();

    const many = [makeTicket({ id: 'd-2', affected_datasets: ['ds-a', 'ds-b', 'ds-c'] })];
    rerender(<DriftQueue tickets={many} now={FIXED_NOW} />);
    expect(screen.getByText(/Affects 3 datasets$/)).toBeInTheDocument();
  });
});
