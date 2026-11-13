import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RunsList, type RunsListEntry } from '@/app/admin/data/components/RunsList';
import { DurationTrendChart } from '@/app/admin/data/components/DurationTrendChart';
import type { PipelineRun, PipelineRunStatus } from '@/lib/data/types';

const FIXED_NOW = Date.parse('2026-04-26T12:00:00Z');
const HOUR = 3600 * 1000;
const MINUTE = 60 * 1000;

function makeRun(over: Partial<RunsListEntry> & { id: string; status: PipelineRunStatus }): RunsListEntry {
  const startedSec = Math.floor((FIXED_NOW - 30 * MINUTE) / 1000);
  return {
    id: over.id,
    triggered_by: over.triggered_by ?? 'schedule',
    started_at: over.started_at ?? ({ _seconds: startedSec } as never),
    ended_at: over.ended_at ?? ({ _seconds: startedSec + 60 } as never),
    duration_ms: 'duration_ms' in over ? over.duration_ms : 60_000,
    github_run_url: over.github_run_url ?? '',
    status: over.status,
    summary: over.summary ?? {
      datasets_total: 5,
      datasets_published: 5,
      datasets_skipped_nochange: 0,
      datasets_blocked_by_drift: 0,
      datasets_failed: 0,
      discovered_files_new: 0,
      schema_drift_opened: 0,
    },
    dataset_outcomes: over.dataset_outcomes ?? [],
    drift_opened: over.drift_opened ?? [],
    discovered_new: over.discovered_new ?? [],
    error_summary: over.error_summary,
  };
}

afterEach(() => cleanup());

describe('REQ-DL-040 — RunsList', () => {
  it('renders the empty state when there are no runs', () => {
    const { container } = render(<RunsList runs={[]} />);
    expect(container.querySelector('[data-empty-runs]')).not.toBeNull();
  });

  it('renders the loading state when loading and no runs', () => {
    const { container } = render(<RunsList runs={[]} loading />);
    expect(container.querySelector('[data-loading]')).not.toBeNull();
  });

  it('renders a row per run with correct status data attribute', () => {
    const runs = [
      makeRun({ id: 'run-001', status: 'success' }),
      makeRun({ id: 'run-002', status: 'failed' }),
      makeRun({ id: 'run-003', status: 'partial' }),
    ];
    const { container } = render(<RunsList runs={runs} now={FIXED_NOW} />);
    const rows = container.querySelectorAll('[data-run]');
    expect(rows.length).toBe(3);
    expect(Array.from(rows).map((r) => r.getAttribute('data-status'))).toEqual([
      'success',
      'failed',
      'partial',
    ]);
  });

  it('links each run id to the detail route', () => {
    const runs = [makeRun({ id: 'run-special', status: 'success' })];
    render(<RunsList runs={runs} now={FIXED_NOW} />);
    expect(screen.getByRole('link', { name: 'run-special' })).toHaveAttribute(
      'href',
      '/admin/data/runs/run-special',
    );
  });

  it('formats short and long durations cleanly', () => {
    const runs = [
      makeRun({ id: 'r-short', status: 'success', duration_ms: 8_000 }),
      makeRun({ id: 'r-long', status: 'success', duration_ms: 5 * MINUTE + 12_000 }),
    ];
    const { container } = render(<RunsList runs={runs} now={FIXED_NOW} />);
    const durations = container.querySelectorAll('[data-duration]');
    expect(durations[0].textContent).toBe('8s');
    expect(durations[1].textContent).toBe('5m 12s');
  });

  it('renders the failed-count block only when datasets_failed > 0', () => {
    const cleanRun = makeRun({ id: 'r-clean', status: 'success' });
    const failedRun = makeRun({
      id: 'r-failed',
      status: 'failed',
      summary: {
        datasets_total: 5,
        datasets_published: 4,
        datasets_skipped_nochange: 0,
        datasets_blocked_by_drift: 0,
        datasets_failed: 1,
        discovered_files_new: 0,
        schema_drift_opened: 0,
      },
    });
    const { container } = render(<RunsList runs={[cleanRun, failedRun]} now={FIXED_NOW} />);
    expect(container.querySelectorAll('dt').length).toBeGreaterThan(0);
    const failedTerms = Array.from(container.querySelectorAll('dt')).filter((dt) =>
      /failed/i.test(dt.textContent ?? ''),
    );
    expect(failedTerms.length).toBe(1);
  });

  it('renders relative time for started_at', () => {
    const runs = [
      makeRun({
        id: 'r-recent',
        status: 'success',
        started_at: { _seconds: Math.floor((FIXED_NOW - 5 * MINUTE) / 1000) } as never,
      }),
    ];
    render(<RunsList runs={runs} now={FIXED_NOW} />);
    expect(screen.getByText(/5m ago/)).toBeInTheDocument();
  });

  it('uses friendly trigger labels', () => {
    const runs = [
      makeRun({ id: 'r-1', status: 'success', triggered_by: 'drive-change' }),
      makeRun({ id: 'r-2', status: 'success', triggered_by: 'manual-dispatch' }),
      makeRun({ id: 'r-3', status: 'success', triggered_by: 'dataset-rerun' }),
    ];
    render(<RunsList runs={runs} now={FIXED_NOW} />);
    expect(screen.getByText(/Drive change/)).toBeInTheDocument();
    expect(screen.getByText(/Manual dispatch/)).toBeInTheDocument();
    expect(screen.getByText(/Dataset rerun/)).toBeInTheDocument();
  });
});

describe('REQ-DL-040 — DurationTrendChart', () => {
  it('renders empty-state when no run has duration_ms', () => {
    const runs = [makeRun({ id: 'r-1', status: 'running', duration_ms: undefined })];
    const { container } = render(<DurationTrendChart runs={runs} />);
    expect(container.querySelector('[data-empty-trend]')).not.toBeNull();
  });

  it('renders one circle per run with status-driven fill', () => {
    const runs = [
      makeRun({ id: 'r-a', status: 'success', duration_ms: 30_000 }),
      makeRun({ id: 'r-b', status: 'failed', duration_ms: 60_000 }),
      makeRun({ id: 'r-c', status: 'partial', duration_ms: 45_000 }),
    ];
    const { container } = render(<DurationTrendChart runs={runs} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('caption reports run count and max duration in human-readable form', () => {
    const runs = [
      makeRun({ id: 'r-1', status: 'success', duration_ms: 90_000 }),
      makeRun({ id: 'r-2', status: 'success', duration_ms: 4 * MINUTE + 30_000 }),
    ];
    render(<DurationTrendChart runs={runs} />);
    expect(screen.getByText('2 runs')).toBeInTheDocument();
    expect(screen.getByText(/max 4m 30s/)).toBeInTheDocument();
  });

  it('respects the limit prop', () => {
    const runs = Array.from({ length: 75 }, (_, i) =>
      makeRun({ id: `r-${i}`, status: 'success', duration_ms: 1_000 + i * 100 }),
    );
    const { container } = render(<DurationTrendChart runs={runs} limit={20} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(20);
  });
});
