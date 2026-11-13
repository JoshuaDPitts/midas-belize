import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { tally } from '@/app/admin/data/hooks/useStaleCount';
import type { CatalogEntry } from '@/lib/data/types';

// Anchored to current wall-clock so dataset ages never drift. The hook
// reads real Date.now() (FreshnessBanner doesn't take an injected `now`),
// so the fixture must be relative to it.
const FIXED_NOW = Date.now();
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const STALE_CUTOFF = 24 * HOUR;
const OLD_CUTOFF = 7 * DAY;

afterEach(() => cleanup());

function makeDataset(id: string, ageMs: number | null): CatalogEntry {
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
    scope: 'site',
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

describe('REQ-DL-048 — tally', () => {
  it('returns zero counts on an empty list', () => {
    const result = tally([], FIXED_NOW, STALE_CUTOFF, OLD_CUTOFF);
    expect(result).toEqual({ stale: 0, old: 0, total: 0, loading: false });
  });

  it('counts datasets older than 24h as stale', () => {
    const datasets = [
      makeDataset('fresh', 2 * HOUR),
      makeDataset('still-fresh', 23 * HOUR),
      makeDataset('stale-2d', 2 * DAY),
      makeDataset('stale-5d', 5 * DAY),
    ];
    const result = tally(datasets, FIXED_NOW, STALE_CUTOFF, OLD_CUTOFF);
    expect(result.stale).toBe(2);
    expect(result.old).toBe(0);
    expect(result.total).toBe(4);
  });

  it('counts datasets older than 7d as both stale AND old', () => {
    const datasets = [
      makeDataset('fresh', 2 * HOUR),
      makeDataset('stale-3d', 3 * DAY),
      makeDataset('old-10d', 10 * DAY),
      makeDataset('old-30d', 30 * DAY),
    ];
    const result = tally(datasets, FIXED_NOW, STALE_CUTOFF, OLD_CUTOFF);
    expect(result.stale).toBe(3);
    expect(result.old).toBe(2);
  });

  it('skips datasets with no updated_at timestamp', () => {
    const datasets = [
      makeDataset('fresh', 2 * HOUR),
      makeDataset('unknown', null),
      makeDataset('stale', 3 * DAY),
    ];
    const result = tally(datasets, FIXED_NOW, STALE_CUTOFF, OLD_CUTOFF);
    expect(result.stale).toBe(1);
    expect(result.total).toBe(3);
  });

  it('passes through the loading flag', () => {
    expect(tally([], FIXED_NOW, STALE_CUTOFF, OLD_CUTOFF, true).loading).toBe(true);
    expect(tally([], FIXED_NOW, STALE_CUTOFF, OLD_CUTOFF, false).loading).toBe(false);
  });
});

// FreshnessBanner is wired to the SWR-backed usePipelineStatus and is
// covered end-to-end by tests/e2e/data-layer-dashboard-freshness.spec.ts —
// the unit-level surface here is the pure tally() helper above. We still
// assert the banner doesn't render at all when stale=0 by inlining the
// component with a mocked hook in a focused test below.

import { vi } from 'vitest';
vi.mock('@/lib/data', () => ({
  usePipelineStatus: vi.fn(),
}));
import { usePipelineStatus } from '@/lib/data';
import { FreshnessBanner } from '@/app/admin/data/components/FreshnessBanner';

describe('REQ-DL-048 — FreshnessBanner', () => {
  it('renders nothing when there are no stale datasets', () => {
    vi.mocked(usePipelineStatus).mockReturnValue({
      datasets: [makeDataset('fresh', 2 * HOUR)],
      runs: [],
      loading: false,
      error: null,
    });
    const { container } = render(<FreshnessBanner />);
    expect(container.querySelector('[data-freshness-banner]')).toBeNull();
  });

  it('renders nothing while loading', () => {
    vi.mocked(usePipelineStatus).mockReturnValue({
      datasets: [],
      runs: [],
      loading: true,
      error: null,
    });
    const { container } = render(<FreshnessBanner />);
    expect(container.querySelector('[data-freshness-banner]')).toBeNull();
  });

  it('renders a stale-severity banner when 24h<age<7d', () => {
    vi.mocked(usePipelineStatus).mockReturnValue({
      datasets: [
        makeDataset('fresh-1', 2 * HOUR),
        makeDataset('stale-1', 3 * DAY),
        makeDataset('stale-2', 5 * DAY),
      ],
      runs: [],
      loading: false,
      error: null,
    });
    const { container } = render(<FreshnessBanner />);
    const banner = container.querySelector('[data-freshness-banner]');
    expect(banner).not.toBeNull();
    expect(banner?.getAttribute('data-severity')).toBe('stale');
    expect(screen.getByText('2', { selector: '[data-stale-count]' })).toBeInTheDocument();
  });

  it('escalates to "old" severity when any dataset is >7d', () => {
    vi.mocked(usePipelineStatus).mockReturnValue({
      datasets: [
        makeDataset('stale-1', 3 * DAY),
        makeDataset('old-1', 10 * DAY),
      ],
      runs: [],
      loading: false,
      error: null,
    });
    const { container } = render(<FreshnessBanner />);
    expect(container.querySelector('[data-severity="old"]')).not.toBeNull();
    expect(screen.getByText(/1 > 7d/)).toBeInTheDocument();
  });

  it('links to /admin/data so users can filter to the offending datasets', () => {
    vi.mocked(usePipelineStatus).mockReturnValue({
      datasets: [makeDataset('stale-1', 3 * DAY)],
      runs: [],
      loading: false,
      error: null,
    });
    render(<FreshnessBanner />);
    expect(screen.getByRole('link', { name: /review stale datasets/ })).toHaveAttribute(
      'href',
      '/admin/data',
    );
  });
});
