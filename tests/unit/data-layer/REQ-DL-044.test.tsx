import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SWRConfig } from 'swr';
import {
  DiscoveredFilesList,
  type DiscoveredEntry,
} from '@/app/admin/data/components/DiscoveredFilesList';
import { useDiscovered } from '@/app/admin/data/hooks/useDiscovered';

const FIXED_NOW = Date.parse('2026-04-26T16:00:00Z');
const HOUR = 3600 * 1000;

const swrWrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

function makeFile(over: Partial<DiscoveredEntry> & { id: string }): DiscoveredEntry {
  const seenSec = Math.floor((FIXED_NOW - 2 * HOUR) / 1000);
  return {
    id: over.id,
    path: over.path ?? `raw/MIMES/Mystery/${over.id}.dat`,
    ext: 'ext' in over ? (over.ext as string) : '.dat',
    mime: 'mime' in over ? (over.mime as string) : 'application/octet-stream',
    size_bytes: over.size_bytes ?? 4_096,
    first_seen: over.first_seen ?? ({ _seconds: seenSec } as never),
    last_seen: over.last_seen ?? ({ _seconds: seenSec } as never),
    seen_in_runs: over.seen_in_runs ?? ['sched-001'],
    sample_bytes_base64: over.sample_bytes_base64,
    status: over.status ?? 'unrecognized',
    ignored_reason: over.ignored_reason,
    suggested_converter: over.suggested_converter,
  };
}

afterEach(() => cleanup());

describe('REQ-DL-044 — useDiscovered hook', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('defaults to status=unrecognized', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ discovered: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { result } = renderHook(() => useDiscovered(), { wrapper: swrWrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(global.fetch).toHaveBeenCalledWith('/api/ops/discovered?status=unrecognized');
  });

  it('honours an explicit status', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ discovered: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    renderHook(() => useDiscovered({ status: 'pending_converter' }), {
      wrapper: swrWrapper,
    });
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/ops/discovered?status=pending_converter',
    );
  });

  it('exposes refresh as the SWR mutate function', async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ discovered: [{ id: 'a' }] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const { result } = renderHook(() => useDiscovered(), { wrapper: swrWrapper });
    await waitFor(() => expect(result.current.files.length).toBe(1));
    expect(typeof result.current.refresh).toBe('function');
  });
});

describe('REQ-DL-044 — DiscoveredFilesList', () => {
  it('renders empty + loading states', () => {
    const { container, rerender } = render(
      <DiscoveredFilesList files={[]} onRefresh={() => undefined} now={FIXED_NOW} />,
    );
    expect(container.querySelector('[data-empty-discovered]')).not.toBeNull();
    rerender(
      <DiscoveredFilesList files={[]} loading onRefresh={() => undefined} now={FIXED_NOW} />,
    );
    expect(container.querySelector('[data-loading]')).not.toBeNull();
  });

  it('renders one card per file with [data-status]', () => {
    const files = [
      makeFile({ id: 'f-1', status: 'unrecognized' }),
      makeFile({ id: 'f-2', status: 'pending_converter', suggested_converter: 'kml' }),
      makeFile({
        id: 'f-3',
        status: 'ignored',
        ignored_reason: 'temporary scratch',
      }),
    ];
    const { container } = render(
      <DiscoveredFilesList files={files} onRefresh={() => undefined} now={FIXED_NOW} />,
    );
    const cards = container.querySelectorAll('[data-discovered]');
    expect(cards.length).toBe(3);
    expect(Array.from(cards).map((c) => c.getAttribute('data-status'))).toEqual([
      'unrecognized',
      'pending_converter',
      'ignored',
    ]);
  });

  it('renders the suggested-converter banner for pending status', () => {
    const files = [
      makeFile({
        id: 'f-1',
        status: 'pending_converter',
        suggested_converter: 'kml',
      }),
    ];
    const { container } = render(
      <DiscoveredFilesList files={files} onRefresh={() => undefined} now={FIXED_NOW} />,
    );
    expect(container.querySelector('[data-suggestion]')).not.toBeNull();
    expect(screen.getByText('kml')).toBeInTheDocument();
  });

  it('renders the ignored-reason for ignored status', () => {
    const files = [
      makeFile({
        id: 'f-1',
        status: 'ignored',
        ignored_reason: 'macOS .DS_Store noise',
      }),
    ];
    const { container } = render(
      <DiscoveredFilesList files={files} onRefresh={() => undefined} now={FIXED_NOW} />,
    );
    expect(container.querySelector('[data-ignored-reason]')).not.toBeNull();
    expect(screen.getByText('macOS .DS_Store noise')).toBeInTheDocument();
  });

  it('hides triage actions on resolved cards (ignored / pending_converter)', () => {
    const files = [
      makeFile({ id: 'f-1', status: 'ignored', ignored_reason: 'x' }),
      makeFile({ id: 'f-2', status: 'pending_converter', suggested_converter: 'kml' }),
    ];
    const { container } = render(
      <DiscoveredFilesList files={files} onRefresh={() => undefined} now={FIXED_NOW} />,
    );
    expect(container.querySelectorAll('[data-actions]').length).toBe(0);
  });

  it('opens the Suggest converter form, calls /classify, and refreshes', async () => {
    const user = userEvent.setup();
    const files = [makeFile({ id: 'f-1', status: 'unrecognized' })];
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    render(
      <DiscoveredFilesList files={files} onRefresh={onRefresh} now={FIXED_NOW} />,
    );
    await user.click(screen.getByRole('button', { name: 'Suggest converter' }));
    const input = screen.getByPlaceholderText(/e\.g\. kml, netcdf, ply/);
    await user.type(input, 'kml');
    await user.click(screen.getByRole('button', { name: 'Suggest converter' }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    const classifyCall = fetchSpy.mock.calls.find(
      ([u]) => typeof u === 'string' && u.includes('/classify'),
    );
    expect(classifyCall).toBeTruthy();
    expect(classifyCall![0]).toBe('/api/ops/discovered/f-1/classify');
    expect(JSON.parse(String((classifyCall![1] as RequestInit).body))).toEqual({
      action: 'suggest-converter',
      suggested_converter: 'kml',
    });
  });

  it('surfaces a 429 rate-limit error inline and keeps the form open', async () => {
    const user = userEvent.setup();
    const files = [makeFile({ id: 'f-1', status: 'unrecognized' })];
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('limited', {
        status: 429,
        headers: { 'Retry-After': '180' },
      }),
    );
    render(
      <DiscoveredFilesList
        files={files}
        onRefresh={() => undefined}
        now={FIXED_NOW}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Ignore' }));
    await user.click(screen.getByRole('button', { name: 'Confirm ignore' }));
    const err = await screen.findByRole('alert');
    expect(err).toHaveTextContent(/Rate limit reached/);
    expect(err).toHaveTextContent(/3m/);
  });
});
