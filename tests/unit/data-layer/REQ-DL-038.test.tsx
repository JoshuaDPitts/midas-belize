import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FreshnessIndicator } from '@/app/admin/data/components/FreshnessIndicator';
import { DatasetsTable } from '@/app/admin/data/components/DatasetsTable';
import type { CatalogEntry, DatasetStatus } from '@/lib/data/types';

const FIXED_NOW = Date.parse('2026-04-25T20:00:00Z');
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function makeEntry(overrides: Partial<CatalogEntry> & { id: string; status: DatasetStatus }): CatalogEntry {
  const updatedSeconds = Math.floor((FIXED_NOW - 2 * HOUR) / 1000);
  return {
    id: overrides.id,
    layer: overrides.layer ?? overrides.id,
    title: overrides.title ?? overrides.id.replace(/-/g, ' '),
    description: overrides.description ?? '',
    family: overrides.family ?? 'mimes',
    schema_id: overrides.schema_id ?? 'mimes-polygon-detail',
    schema_version: overrides.schema_version ?? 1,
    scope: overrides.scope ?? 'site',
    sites: overrides.sites ?? ['placencia'],
    visible_at: overrides.visible_at ?? ['placencia'],
    tags: overrides.tags ?? [],
    current_version: overrides.current_version ?? {
      version: 'v2026-04-25-abc1234',
      gcs_path: 'gs://midas-data/foo',
      content_type: 'application/geo+json',
      size_bytes: 42_000,
      bbox: [-89, 16, -88, 17],
      published_at: { _seconds: updatedSeconds } as never,
      pipeline_run_id: 'run-test-001',
    },
    provenance: overrides.provenance ?? {
      source: 'MIDAS test',
      source_url: null,
      license: 'internal',
      citation: 'test',
      upstream_paths: [],
    },
    status: overrides.status,
    last_upstream_mtime: overrides.last_upstream_mtime ?? ({ _seconds: updatedSeconds } as never),
    last_processed_at: overrides.last_processed_at ?? ({ _seconds: updatedSeconds } as never),
    created_at: overrides.created_at ?? ({ _seconds: updatedSeconds } as never),
    updated_at: overrides.updated_at ?? ({ _seconds: updatedSeconds } as never),
  };
}

afterEach(() => cleanup());

describe('REQ-DL-038 — FreshnessIndicator bucket logic', () => {
  it('marks <24h as fresh', () => {
    render(<FreshnessIndicator updatedAt={FIXED_NOW - 2 * HOUR} now={FIXED_NOW} />);
    const el = screen.getByTitle(/Updated 2h ago/);
    expect(el).toHaveAttribute('data-bucket', 'fresh');
  });

  it('marks 24h–7d as stale', () => {
    render(<FreshnessIndicator updatedAt={FIXED_NOW - 3 * DAY} now={FIXED_NOW} />);
    const el = screen.getByTitle(/Updated 3d ago/);
    expect(el).toHaveAttribute('data-bucket', 'stale');
  });

  it('marks ≥7d as old', () => {
    render(<FreshnessIndicator updatedAt={FIXED_NOW - 14 * DAY} now={FIXED_NOW} />);
    const el = screen.getByTitle(/Updated 14d ago/);
    expect(el).toHaveAttribute('data-bucket', 'old');
  });

  it('renders unknown bucket for null timestamp', () => {
    const { container } = render(<FreshnessIndicator updatedAt={null} now={FIXED_NOW} />);
    expect(container.querySelector('[data-bucket="unknown"]')).not.toBeNull();
  });
});

describe('REQ-DL-038 — DatasetsTable filter / sort / search', () => {
  const datasets: CatalogEntry[] = [
    makeEntry({ id: 'placencia-coast', status: 'published', tags: ['marine', 'coast'] }),
    makeEntry({ id: 'placencia-marine', status: 'awaiting-provenance', tags: ['marine'] }),
    makeEntry({ id: 'cayecaulker-site', status: 'published', tags: ['terrestrial'] }),
    makeEntry({
      id: 'gfw-2024',
      status: 'orphaned',
      scope: 'national',
      tags: ['gfw'],
      title: 'Global Fishing Watch 2024',
    }),
  ];

  beforeEach(() => {
    cleanup();
  });

  it('lists every dataset by default', () => {
    render(<DatasetsTable datasets={datasets} now={FIXED_NOW} />);
    const rows = screen.getAllByRole('row');
    expect(rows.length - 1).toBe(datasets.length);
    const counter = screen.getByText(/of \d/);
    expect(counter.textContent).toContain(`${datasets.length} of ${datasets.length}`);
  });

  it('narrows by status filter', async () => {
    const user = userEvent.setup();
    render(<DatasetsTable datasets={datasets} now={FIXED_NOW} />);
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'published');
    const rows = screen.getAllByRole('row').slice(1);
    const ids = rows.map((r) => within(r).getAllByRole('cell')[0].textContent?.trim());
    expect(ids).toEqual(expect.arrayContaining(['placencia-coast', 'cayecaulker-site']));
    expect(ids).not.toContain('gfw-2024');
  });

  it('narrows by search query against id/title/tag', async () => {
    const user = userEvent.setup();
    render(<DatasetsTable datasets={datasets} now={FIXED_NOW} />);
    const search = screen.getByLabelText('Search datasets');
    await user.type(search, 'marine');
    const rows = screen.getAllByRole('row').slice(1);
    const ids = rows.map((r) => within(r).getAllByRole('cell')[0].textContent?.trim());
    expect(ids).toEqual(expect.arrayContaining(['placencia-coast', 'placencia-marine']));
    expect(ids).not.toContain('cayecaulker-site');
  });

  it('toggles sort direction when clicking the same column', async () => {
    const user = userEvent.setup();
    render(<DatasetsTable datasets={datasets} now={FIXED_NOW} />);
    const idHeader = screen.getByRole('button', { name: /^ID/ });
    await user.click(idHeader);
    const ascIds = screen.getAllByRole('row').slice(1).map((r) =>
      within(r).getAllByRole('cell')[0].textContent?.trim(),
    );
    expect(ascIds[0]).toBe('cayecaulker-site');

    await user.click(idHeader);
    const descIds = screen.getAllByRole('row').slice(1).map((r) =>
      within(r).getAllByRole('cell')[0].textContent?.trim(),
    );
    expect(descIds[0]).toBe('placencia-marine');
  });

  it('renders an empty-state row when filters exclude every dataset', async () => {
    const user = userEvent.setup();
    render(<DatasetsTable datasets={datasets} now={FIXED_NOW} />);
    await user.type(screen.getByLabelText('Search datasets'), 'no-match-string');
    expect(screen.getByText(/No datasets match the current filters/)).toBeInTheDocument();
  });

  it('links each dataset id to its detail route', () => {
    render(<DatasetsTable datasets={datasets} now={FIXED_NOW} />);
    const link = screen.getByRole('link', { name: 'placencia-coast' });
    expect(link).toHaveAttribute('href', '/admin/data/dataset/placencia-coast');
  });

  it('renders status pill with the friendly label and data-status attribute', () => {
    const { container } = render(<DatasetsTable datasets={datasets} now={FIXED_NOW} />);
    const pills = container.querySelectorAll('[data-status="published"]');
    expect(pills.length).toBeGreaterThan(0);
    expect(pills[0].textContent?.trim()).toBe('Published');
  });

  it('shows loading row when loading=true and dataset list is empty', () => {
    render(<DatasetsTable datasets={[]} loading now={FIXED_NOW} />);
    expect(screen.getByText('Loading datasets…')).toBeInTheDocument();
  });
});
