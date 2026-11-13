import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import {
  SuccessRateChart,
  bucketByDay,
} from '@/app/admin/data/components/SuccessRateChart';
import {
  FreshnessHeatmap,
  bucketForAge,
} from '@/app/admin/data/components/FreshnessHeatmap';
import type { CatalogEntry, PipelineRun, PipelineRunStatus } from '@/lib/data/types';

const FIXED_NOW = Date.parse('2026-04-26T12:00:00Z');
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

afterEach(() => cleanup());

function makeRun(
  daysAgo: number,
  status: PipelineRunStatus,
  id = `run-${daysAgo}-${status}`,
): PipelineRun & { id: string } {
  const startedSec = Math.floor((FIXED_NOW - daysAgo * DAY - 2 * HOUR) / 1000);
  return {
    id,
    triggered_by: 'schedule',
    started_at: { _seconds: startedSec } as never,
    ended_at: { _seconds: startedSec + 60 } as never,
    duration_ms: 60_000,
    github_run_url: '',
    status,
    summary: {
      datasets_total: 1,
      datasets_published: status === 'success' ? 1 : 0,
      datasets_skipped_nochange: 0,
      datasets_blocked_by_drift: 0,
      datasets_failed: status === 'failed' ? 1 : 0,
      discovered_files_new: 0,
      schema_drift_opened: 0,
    },
    dataset_outcomes: [],
    drift_opened: [],
    discovered_new: [],
  };
}

function makeDataset(
  id: string,
  ageMs: number | null,
  scope: CatalogEntry['scope'] = 'site',
): CatalogEntry {
  const updatedSec =
    ageMs == null ? 0 : Math.floor((FIXED_NOW - ageMs) / 1000);
  return {
    id,
    layer: id,
    title: id,
    description: '',
    family: 'mimes',
    schema_id: 'mimes-polygon-detail',
    schema_version: 1,
    scope,
    sites: [],
    visible_at: [],
    tags: [],
    current_version: null,
    provenance: {
      source: 'test',
      source_url: null,
      license: 'test',
      citation: 'test',
      upstream_paths: [],
    },
    status: 'published',
    last_upstream_mtime: { _seconds: updatedSec } as never,
    last_processed_at: { _seconds: updatedSec } as never,
    created_at: { _seconds: updatedSec } as never,
    updated_at: { _seconds: updatedSec } as never,
  };
}

describe('REQ-DL-045 — bucketByDay', () => {
  it('produces 7 buckets for the default window, oldest first', () => {
    const buckets = bucketByDay([], FIXED_NOW);
    expect(buckets.length).toBe(7);
    expect(buckets[0].endMs).toBeLessThan(buckets[6].endMs);
  });

  it('counts runs into the day they started in', () => {
    const runs = [
      makeRun(0, 'success', 'r-today-ok'),
      makeRun(0, 'failed', 'r-today-fail'),
      makeRun(2, 'success', 'r-2d-ok'),
      makeRun(2, 'success', 'r-2d-ok-2'),
      makeRun(8, 'success', 'r-out-of-window'),
    ];
    const buckets = bucketByDay(runs, FIXED_NOW);
    const today = buckets[6];
    const twoDaysAgo = buckets[4];
    expect(today.total).toBe(2);
    expect(today.success).toBe(1);
    expect(today.successRate).toBeCloseTo(0.5);
    expect(twoDaysAgo.total).toBe(2);
    expect(twoDaysAgo.success).toBe(2);
    expect(twoDaysAgo.successRate).toBe(1);
    // 8d ago is outside the 7-day window.
    const allTotals = buckets.reduce((acc, b) => acc + b.total, 0);
    expect(allTotals).toBe(4);
  });

  it('honours custom windowDays', () => {
    expect(bucketByDay([], FIXED_NOW, 14).length).toBe(14);
  });
});

describe('REQ-DL-045 — SuccessRateChart', () => {
  it('renders 7 day bars by default', () => {
    const { container } = render(<SuccessRateChart runs={[]} now={FIXED_NOW} />);
    expect(container.querySelectorAll('[data-day]')).toHaveLength(7);
  });

  it('caption reports overall success rate + total runs', () => {
    const runs = [
      makeRun(1, 'success'),
      makeRun(2, 'success'),
      makeRun(3, 'failed'),
      makeRun(4, 'partial'),
    ];
    render(<SuccessRateChart runs={runs} now={FIXED_NOW} />);
    expect(screen.getByText('50% success')).toBeInTheDocument();
    expect(screen.getByText(/4 runs in last 7 days/)).toBeInTheDocument();
  });

  it('encodes per-day data as title attributes for tooltip discoverability', () => {
    const runs = [makeRun(1, 'success', 'r-1'), makeRun(1, 'success', 'r-2')];
    const { container } = render(<SuccessRateChart runs={runs} now={FIXED_NOW} />);
    const titles = Array.from(container.querySelectorAll('[data-day]')).map(
      (el) => el.getAttribute('title'),
    );
    const yesterdayMatch = titles.find((t) => t?.includes('2/2 success'));
    expect(yesterdayMatch).toBeTruthy();
  });
});

describe('REQ-DL-045 — bucketForAge', () => {
  it('classifies fresh / stale / old / unknown', () => {
    expect(bucketForAge(2 * HOUR)).toBe('fresh');
    expect(bucketForAge(3 * DAY)).toBe('stale');
    expect(bucketForAge(14 * DAY)).toBe('old');
    expect(bucketForAge(Infinity)).toBe('unknown');
    expect(bucketForAge(-1)).toBe('unknown');
  });
});

describe('REQ-DL-045 — FreshnessHeatmap', () => {
  it('renders an empty state when no datasets', () => {
    const { container } = render(<FreshnessHeatmap datasets={[]} now={FIXED_NOW} />);
    expect(container.querySelector('[data-empty-heatmap]')).not.toBeNull();
  });

  it('renders one cell per dataset with the right bucket attribute', () => {
    const datasets = [
      makeDataset('d-fresh', 2 * HOUR),
      makeDataset('d-stale', 3 * DAY),
      makeDataset('d-old', 14 * DAY),
      makeDataset('d-unknown', null),
    ];
    const { container } = render(
      <FreshnessHeatmap datasets={datasets} now={FIXED_NOW} />,
    );
    const cells = container.querySelectorAll('[data-dataset]');
    expect(cells.length).toBe(4);
    const buckets = Array.from(cells).map((c) => c.getAttribute('data-bucket'));
    expect(buckets).toEqual(['fresh', 'stale', 'old', 'unknown']);
  });

  it('legend reflects per-bucket counts', () => {
    const datasets = [
      makeDataset('d-1', 2 * HOUR),
      makeDataset('d-2', 5 * HOUR),
      makeDataset('d-3', 3 * DAY),
      makeDataset('d-4', 14 * DAY),
    ];
    render(<FreshnessHeatmap datasets={datasets} now={FIXED_NOW} />);
    expect(screen.getByText(/2 fresh/)).toBeInTheDocument();
    expect(screen.getByText(/1 stale/)).toBeInTheDocument();
    expect(screen.getByText(/1 old/)).toBeInTheDocument();
  });

  it('hides the unknown legend chip when no unknown datasets exist', () => {
    const datasets = [makeDataset('d-1', 2 * HOUR)];
    render(<FreshnessHeatmap datasets={datasets} now={FIXED_NOW} />);
    expect(screen.queryByText(/unknown/)).toBeNull();
  });
});
