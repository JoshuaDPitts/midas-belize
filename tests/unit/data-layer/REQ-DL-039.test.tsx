import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProvenanceCard } from '@/app/admin/data/components/ProvenanceCard';
import {
  VersionHistoryTimeline,
  formatBytes,
} from '@/app/admin/data/components/VersionHistoryTimeline';
import { DiffViewer } from '@/app/admin/data/components/DiffViewer';
import { RerunButton } from '@/app/admin/data/components/RerunButton';
import type { DatasetVersion, Provenance } from '@/lib/data/types';

const FIXED_NOW = Date.parse('2026-04-25T20:00:00Z');
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

function makeVersion(over: Partial<DatasetVersion> & { version: string }): DatasetVersion {
  const seconds = Math.floor((FIXED_NOW - 2 * HOUR) / 1000);
  return {
    version: over.version,
    gcs_path: over.gcs_path ?? `gs://midas-data/foo/${over.version}.geojson`,
    content_hash: over.content_hash ?? 'abc123',
    content_type: over.content_type ?? 'application/geo+json',
    size_bytes: over.size_bytes ?? 24_000,
    feature_count: over.feature_count ?? 23,
    bbox: over.bbox ?? [-89, 16, -88, 17],
    published_at: over.published_at ?? ({ _seconds: seconds } as never),
    pipeline_run_id: over.pipeline_run_id ?? 'run-001',
    source_file_paths: over.source_file_paths ?? [{ path: 'raw/x.csv', hash: 'h' }],
    schema_version: over.schema_version ?? 1,
    is_current: over.is_current ?? false,
  };
}

afterEach(() => cleanup());

describe('REQ-DL-039 — ProvenanceCard', () => {
  const provenance: Provenance = {
    source: 'MIDAS test source',
    source_url: 'https://example.com/data',
    license: 'Internal use only',
    citation: 'MIDAS/MIMES Belize 2026 — sample',
    upstream_paths: ['raw/test.csv', 'raw/test.shp'],
  };

  it('renders all provenance fields', () => {
    render(<ProvenanceCard provenance={provenance} />);
    expect(screen.getByText('MIDAS test source')).toBeInTheDocument();
    expect(screen.getByText('Internal use only')).toBeInTheDocument();
    expect(screen.getByText(/MIMES Belize 2026/)).toBeInTheDocument();
    expect(screen.getByText('raw/test.csv')).toBeInTheDocument();
    expect(screen.getByText('raw/test.shp')).toBeInTheDocument();
  });

  it('renders source_url as an external link', () => {
    render(<ProvenanceCard provenance={provenance} />);
    const link = screen.getByRole('link', { name: 'https://example.com/data' });
    expect(link).toHaveAttribute('href', 'https://example.com/data');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer noopener');
  });

  it('omits the URL row when source_url is null', () => {
    render(<ProvenanceCard provenance={{ ...provenance, source_url: null }} />);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders em-dash placeholder when upstream_paths is empty', () => {
    render(<ProvenanceCard provenance={{ ...provenance, upstream_paths: [] }} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('REQ-DL-039 — formatBytes', () => {
  it('formats bytes / KB / MB cleanly', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 * 1024 * 5.5)).toBe('5.5 MB');
  });

  it('returns em-dash for null / negative / NaN inputs', () => {
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(undefined)).toBe('—');
    expect(formatBytes(-1)).toBe('—');
    expect(formatBytes(Number.NaN)).toBe('—');
  });
});

describe('REQ-DL-039 — VersionHistoryTimeline', () => {
  it('renders an empty-state message when versions is empty', () => {
    const { container } = render(<VersionHistoryTimeline versions={[]} />);
    expect(container.querySelector('[data-empty-versions]')).not.toBeNull();
    expect(screen.getByText('No versions published yet.')).toBeInTheDocument();
  });

  it('marks the current version with [data-current] and a current badge', () => {
    const versions = [
      makeVersion({
        version: 'v1',
        is_current: true,
        published_at: { _seconds: Math.floor((FIXED_NOW - 2 * HOUR) / 1000) } as never,
      }),
      makeVersion({
        version: 'v2',
        is_current: false,
        published_at: { _seconds: Math.floor((FIXED_NOW - 3 * DAY) / 1000) } as never,
      }),
    ];
    const { container } = render(<VersionHistoryTimeline versions={versions} now={FIXED_NOW} />);
    const currentRows = container.querySelectorAll('[data-current]');
    expect(currentRows.length).toBe(1);
    expect(currentRows[0].getAttribute('data-version')).toBe('v1');
    expect(screen.getByText('current')).toBeInTheDocument();
  });

  it('formats relative time labels per published_at', () => {
    const versions = [
      makeVersion({
        version: 'v-fresh',
        published_at: { _seconds: Math.floor((FIXED_NOW - 2 * HOUR) / 1000) } as never,
      }),
      makeVersion({
        version: 'v-old',
        published_at: { _seconds: Math.floor((FIXED_NOW - 5 * DAY) / 1000) } as never,
      }),
    ];
    render(<VersionHistoryTimeline versions={versions} now={FIXED_NOW} />);
    expect(screen.getByText('2h ago')).toBeInTheDocument();
    expect(screen.getByText('5d ago')).toBeInTheDocument();
  });
});

describe('REQ-DL-039 — DiffViewer', () => {
  const baseFrom = makeVersion({ version: 'v1', size_bytes: 20_000, feature_count: 100 });
  const sameBboxTo = makeVersion({
    version: 'v2',
    size_bytes: 24_000,
    feature_count: 110,
    is_current: true,
  });

  it('renders signed feature delta with positive sentiment', () => {
    const { container } = render(<DiffViewer from={baseFrom} to={sameBboxTo} />);
    const featureDelta = container.querySelector('[data-sentiment="pos"]');
    expect(featureDelta).not.toBeNull();
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('renders signed size delta in friendly bytes format', () => {
    render(<DiffViewer from={baseFrom} to={sameBboxTo} />);
    expect(screen.getByText('+3.9 KB')).toBeInTheDocument();
  });

  it('renders negative delta with neg sentiment', () => {
    const shrunk = makeVersion({
      version: 'v3',
      size_bytes: 10_000,
      feature_count: 50,
      is_current: true,
    });
    const { container } = render(<DiffViewer from={baseFrom} to={shrunk} />);
    expect(container.querySelectorAll('[data-sentiment="neg"]').length).toBe(2);
    expect(screen.getByText('-50')).toBeInTheDocument();
  });

  it('says "Unchanged" when the bbox is identical', () => {
    render(<DiffViewer from={baseFrom} to={sameBboxTo} />);
    expect(screen.getByText('Unchanged')).toBeInTheDocument();
  });

  it('says "Changed" and shows old/new bbox rows when bbox differs', () => {
    const movedBbox = makeVersion({
      version: 'v4',
      bbox: [-90, 15, -87, 18],
      is_current: true,
    });
    render(<DiffViewer from={baseFrom} to={movedBbox} />);
    expect(screen.getByText('Changed')).toBeInTheDocument();
    expect(screen.getByText(/-90.0000/)).toBeInTheDocument();
  });
});

describe('REQ-DL-039 — RerunButton', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('POSTs to /api/ops/rerun/[id] and calls onStarted with run_id', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ run_id: 'rerun-abc', status: 'queued' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const onStarted = vi.fn();
    render(<RerunButton datasetId="placencia-coast" onStarted={onStarted} />);
    await user.click(screen.getByRole('button', { name: /Rerun this dataset/ }));
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith('rerun-abc'));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/ops/rerun/placencia-coast',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('surfaces the rate-limit message when 429 is returned', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(
      new Response('limited', {
        status: 429,
        headers: { 'Retry-After': '120' },
      }),
    );
    const onStarted = vi.fn();
    render(<RerunButton datasetId="placencia-coast" onStarted={onStarted} />);
    await user.click(screen.getByRole('button', { name: /Rerun this dataset/ }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Rate limit reached/);
    expect(alert).toHaveTextContent(/2m/);
    expect(onStarted).not.toHaveBeenCalled();
  });

  it('shows an error when the response is not ok', async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(new Response('boom', { status: 502 }));
    const onStarted = vi.fn();
    render(<RerunButton datasetId="placencia-coast" onStarted={onStarted} />);
    await user.click(screen.getByRole('button', { name: /Rerun this dataset/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/502/);
    expect(onStarted).not.toHaveBeenCalled();
  });

  it('disables the button while pending', async () => {
    let resolveFetch: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<RerunButton datasetId="placencia-coast" onStarted={() => undefined} />);
    const button = screen.getByRole('button', { name: /Rerun this dataset/ });
    await user.click(button);
    expect(screen.getByRole('button', { name: /Triggering rerun…/ })).toBeDisabled();
    resolveFetch(
      new Response(JSON.stringify({ run_id: 'rerun-1', status: 'queued' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Rerun this dataset/ })).not.toBeDisabled(),
    );
  });
});
