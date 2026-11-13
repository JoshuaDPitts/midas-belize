import type { Page } from '@playwright/test';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const MINUTE = 60 * 1000;

export const FIXTURE_IDS = {
  dataset: 'placencia-coast-ebin-clade-detail',
  run: 'drive-1745619600-eeff0011',
  drift: 'drift-mimes-polygon-detail-aabbcc',
} as const;

interface Timestamp {
  _seconds: number;
}

function sec(now: number, offset: number): Timestamp {
  return { _seconds: Math.floor((now - offset) / 1000) };
}

export interface FakeDataset {
  id: string;
  layer: string;
  title: string;
  description: string;
  family: string;
  schema_id: string;
  schema_version: number;
  scope: 'site' | 'multi-site' | 'national';
  sites: string[];
  visible_at: string[];
  tags: string[];
  current_version: { version: string } | null;
  status: string;
  updated_at: Timestamp;
  provenance: {
    source: string;
    source_url: string | null;
    license: string;
    citation: string;
    upstream_paths: string[];
  };
}

export function datasetsListFixture(now = Date.now()): FakeDataset[] {
  return [
    {
      id: 'placencia-coast-ebin-clade-detail',
      layer: 'placencia-coast-ebin-clade-detail',
      title: 'Placencia coast — EBIN clade detail',
      description: '',
      family: 'mimes',
      schema_id: 'mimes-polygon-detail',
      schema_version: 1,
      scope: 'site',
      sites: ['placencia'],
      visible_at: ['placencia'],
      tags: ['marine', 'coast', 'mimes-output'],
      current_version: { version: 'v2026-04-25-abc1234' },
      status: 'published',
      updated_at: sec(now, 2 * HOUR),
      provenance: emptyProvenance(),
    },
    {
      id: 'placencia-watersheds-ebin-clade-detail',
      layer: 'placencia-watersheds-ebin-clade-detail',
      title: 'Placencia watersheds — EBIN clade detail',
      description: '',
      family: 'mimes',
      schema_id: 'mimes-polygon-detail',
      schema_version: 1,
      scope: 'site',
      sites: ['placencia'],
      visible_at: ['placencia'],
      tags: ['terrestrial', 'watersheds'],
      current_version: { version: 'v2026-04-22-def5678' },
      status: 'awaiting-provenance',
      updated_at: sec(now, 3 * DAY),
      provenance: emptyProvenance(),
    },
    {
      id: 'gfw-presence-2024',
      layer: 'gfw-presence-2024',
      title: 'Global Fishing Watch presence — 2024',
      description: '',
      family: 'gfw',
      schema_id: 'gfw-presence',
      schema_version: 1,
      scope: 'national',
      sites: [],
      visible_at: ['placencia', 'caye-caulker', 'laughing-bird'],
      tags: ['marine', 'gfw'],
      current_version: { version: 'v2026-04-15-xyz9876' },
      status: 'schema-drift-blocked',
      updated_at: sec(now, 20 * DAY),
      provenance: emptyProvenance(),
    },
    {
      id: 'rfactor-monthly-january',
      layer: 'rfactor-monthly-january',
      title: 'R-factor monthly — January',
      description: '',
      family: 'rfactor-monthly',
      schema_id: 'rfactor-monthly',
      schema_version: 1,
      scope: 'national',
      sites: [],
      visible_at: ['placencia', 'caye-caulker', 'laughing-bird'],
      tags: ['raster', 'erosivity'],
      current_version: { version: 'v2026-04-25-aaa1111' },
      status: 'processing',
      updated_at: sec(now, 30 * MINUTE),
      provenance: emptyProvenance(),
    },
  ];
}

function emptyProvenance() {
  return {
    source: 'MIDAS test',
    source_url: null,
    license: 'internal',
    citation: 'MIDAS test',
    upstream_paths: [],
  };
}

export interface FakeRun {
  id: string;
  triggered_by: 'drive-change' | 'manual-dispatch' | 'schedule' | 'dataset-rerun';
  started_at: Timestamp;
  ended_at?: Timestamp;
  duration_ms?: number;
  github_run_url: string;
  status: 'running' | 'success' | 'partial' | 'failed';
  summary: {
    datasets_total: number;
    datasets_published: number;
    datasets_skipped_nochange: number;
    datasets_blocked_by_drift: number;
    datasets_failed: number;
    discovered_files_new: number;
    schema_drift_opened: number;
  };
  dataset_outcomes: Array<{
    dataset_id: string;
    version_before?: string;
    version_after?: string;
    status: string;
    reason?: string;
    duration_ms: number;
  }>;
  drift_opened: string[];
  discovered_new: string[];
  error_summary?: string;
}

export function runsListFixture(now = Date.now()): FakeRun[] {
  return [
    {
      id: 'rerun-1745623200-aabbccdd',
      triggered_by: 'dataset-rerun',
      started_at: sec(now, 15 * MINUTE),
      ended_at: sec(now, 15 * MINUTE - 28_000),
      duration_ms: 28_000,
      github_run_url: '',
      status: 'success',
      summary: defaultSummary({ datasets_total: 1, datasets_published: 1 }),
      dataset_outcomes: [],
      drift_opened: [],
      discovered_new: [],
    },
    {
      id: FIXTURE_IDS.run,
      triggered_by: 'drive-change',
      started_at: sec(now, 2 * HOUR),
      ended_at: sec(now, 2 * HOUR - 3 * MINUTE - 12_000),
      duration_ms: 3 * MINUTE + 12_000,
      github_run_url: '',
      status: 'partial',
      summary: defaultSummary({
        datasets_total: 8,
        datasets_published: 6,
        datasets_blocked_by_drift: 1,
        datasets_failed: 1,
        schema_drift_opened: 1,
      }),
      dataset_outcomes: [],
      drift_opened: ['drift-001'],
      discovered_new: [],
    },
    {
      id: 'sched-1745609000-2233aabb',
      triggered_by: 'schedule',
      started_at: sec(now, 5 * HOUR),
      ended_at: sec(now, 5 * HOUR - 90_000),
      duration_ms: 90_000,
      github_run_url: '',
      status: 'success',
      summary: defaultSummary({
        datasets_total: 12,
        datasets_published: 12,
        discovered_files_new: 2,
      }),
      dataset_outcomes: [],
      drift_opened: [],
      discovered_new: ['file-1', 'file-2'],
    },
    {
      id: 'manual-1745595500-ccdd44ee',
      triggered_by: 'manual-dispatch',
      started_at: sec(now, 8 * HOUR),
      ended_at: sec(now, 8 * HOUR - 4 * MINUTE - 2_000),
      duration_ms: 4 * MINUTE + 2_000,
      github_run_url: '',
      status: 'failed',
      summary: defaultSummary({
        datasets_total: 5,
        datasets_failed: 5,
      }),
      dataset_outcomes: [],
      drift_opened: [],
      discovered_new: [],
      error_summary: 'GHA workflow exited with status 1',
    },
    {
      id: 'sched-1745552500-99887766',
      triggered_by: 'schedule',
      started_at: sec(now, 20 * HOUR),
      ended_at: sec(now, 20 * HOUR - 75_000),
      duration_ms: 75_000,
      github_run_url: '',
      status: 'success',
      summary: defaultSummary({
        datasets_total: 12,
        datasets_published: 12,
      }),
      dataset_outcomes: [],
      drift_opened: [],
      discovered_new: [],
    },
  ];
}

function defaultSummary(over: Partial<FakeRun['summary']> = {}): FakeRun['summary'] {
  return {
    datasets_total: 0,
    datasets_published: 0,
    datasets_skipped_nochange: 0,
    datasets_blocked_by_drift: 0,
    datasets_failed: 0,
    discovered_files_new: 0,
    schema_drift_opened: 0,
    ...over,
  };
}

export interface FakeDriftTicket {
  id: string;
  schema_id: string;
  current_schema_version: number;
  detected_at: Timestamp;
  first_seen_in_run: string;
  last_seen_in_run: string;
  occurrence_count: number;
  diff: {
    missing_required: string[];
    added_unknown: string[];
    renamed_candidates: Array<{ from: string; to: string; confidence: number }>;
    dropped_dynamic: string[];
  };
  affected_datasets: string[];
  sample_rows: Record<string, unknown>[];
  source_file_path: string;
  status: 'open' | 'accepted' | 'rejected' | 'deferred' | 'superseded';
}

export function driftListFixture(now = Date.now()): FakeDriftTicket[] {
  return [
    {
      id: FIXTURE_IDS.drift,
      schema_id: 'mimes-polygon-detail',
      current_schema_version: 1,
      detected_at: sec(now, 2 * HOUR),
      first_seen_in_run: FIXTURE_IDS.run,
      last_seen_in_run: FIXTURE_IDS.run,
      occurrence_count: 1,
      diff: {
        missing_required: ['Polygon_ID', 'BIN_Label'],
        added_unknown: ['New_Mystery_Column'],
        renamed_candidates: [{ from: 'BIN_ID', to: 'BinId', confidence: 0.87 }],
        dropped_dynamic: [],
      },
      affected_datasets: [
        'cayecaulker-mimes-ebin-clade-detail',
        'cayecaulker-mimes-nbs-scores',
      ],
      sample_rows: [
        { Polygon_ID: 1, BIN_ID: 7, BIN_Label: 'BIN-A', Clade_1_pct: 0.42 },
        { Polygon_ID: 2, BIN_ID: 9, BIN_Label: 'BIN-B', Clade_1_pct: 0.18 },
        { Polygon_ID: 3, BIN_ID: 11, BIN_Label: 'BIN-C', Clade_1_pct: null },
      ],
      source_file_path:
        'reference/MIMES_MIDAS/Processed Output/Cayecaulker_mimes_ebin_clade_detail.csv',
      status: 'open',
    },
    {
      id: 'drift-rfactor-monthly-ddeeff',
      schema_id: 'rfactor-monthly',
      current_schema_version: 1,
      detected_at: sec(now, 2 * DAY),
      first_seen_in_run: 'sched-1745454300-cc1122',
      last_seen_in_run: 'sched-1745623200-aa3344',
      occurrence_count: 4,
      diff: {
        missing_required: [],
        added_unknown: ['DataDate', 'BatchId'],
        renamed_candidates: [
          { from: 'month_int', to: 'month_index', confidence: 0.65 },
          { from: 'rfactor_val', to: 'rfactor_value', confidence: 0.92 },
        ],
        dropped_dynamic: ['Clade_5_pct'],
      },
      affected_datasets: ['rfactor-monthly-january'],
      sample_rows: [],
      source_file_path: 'reference/MIMES_MIDAS/Rfactor/Rfactor_January.tiff',
      status: 'open',
    },
    {
      id: 'drift-gfw-presence-bbccdd',
      schema_id: 'gfw-presence',
      current_schema_version: 1,
      detected_at: sec(now, 8 * HOUR),
      first_seen_in_run: 'manual-1745595500-ccdd44ee',
      last_seen_in_run: 'manual-1745595500-ccdd44ee',
      occurrence_count: 1,
      diff: {
        missing_required: ['vessel_class'],
        added_unknown: [],
        renamed_candidates: [],
        dropped_dynamic: [],
      },
      affected_datasets: ['gfw-presence-2024'],
      sample_rows: [],
      source_file_path: 'reference/GFW/presence-2024.csv',
      status: 'open',
    },
  ];
}

export interface FakeDiscoveredFile {
  id: string;
  path: string;
  ext: string;
  mime: string;
  size_bytes: number;
  first_seen: Timestamp;
  last_seen: Timestamp;
  seen_in_runs: string[];
  status: 'unrecognized' | 'pending_converter' | 'ignored';
  ignored_reason?: string;
  suggested_converter?: string;
}

export function discoveredListFixture(now = Date.now()): FakeDiscoveredFile[] {
  return [
    {
      id: 'd1aaaaaa',
      path: 'reference/MIMES_MIDAS/Mystery/sample_2026.kml',
      ext: '.kml',
      mime: 'application/vnd.google-earth.kml+xml',
      size_bytes: 184_320,
      first_seen: sec(now, 2 * HOUR),
      last_seen: sec(now, 2 * HOUR),
      seen_in_runs: [FIXTURE_IDS.run],
      status: 'unrecognized',
    },
    {
      id: 'd2bbbbbb',
      path: 'reference/MIMES_MIDAS/Mystery/wind-buoy-2024.nc',
      ext: '.nc',
      mime: 'application/x-netcdf',
      size_bytes: 24 * 1024 * 1024,
      first_seen: sec(now, 8 * HOUR),
      last_seen: sec(now, 8 * HOUR),
      seen_in_runs: [FIXTURE_IDS.run, 'sched-1745552500-aa3344'],
      status: 'unrecognized',
    },
    {
      id: 'd3cccccc',
      path: 'reference/MIMES_MIDAS/Misc/scratch.bin',
      ext: '.bin',
      mime: 'application/octet-stream',
      size_bytes: 512,
      first_seen: sec(now, 3 * DAY),
      last_seen: sec(now, 3 * DAY),
      seen_in_runs: ['sched-1745454300-cc1122'],
      status: 'unrecognized',
    },
  ];
}

export interface FakeDatasetVersion {
  version: string;
  gcs_path: string;
  content_hash: string;
  content_type: string;
  size_bytes: number;
  feature_count: number;
  bbox: [number, number, number, number];
  published_at: Timestamp;
  pipeline_run_id: string;
  source_file_paths: Array<{ path: string; hash: string }>;
  schema_version: number;
  is_current: boolean;
}

export function datasetDetailFixture(now = Date.now()): {
  dataset: FakeDataset;
  versions: FakeDatasetVersion[];
} {
  return {
    dataset: {
      id: FIXTURE_IDS.dataset,
      layer: FIXTURE_IDS.dataset,
      title: 'Placencia coast — EBIN clade detail',
      description: '',
      family: 'mimes',
      schema_id: 'mimes-polygon-detail',
      schema_version: 1,
      scope: 'site',
      sites: ['placencia'],
      visible_at: ['placencia'],
      tags: ['marine', 'coast', 'mimes-output'],
      current_version: { version: 'v2026-04-25-abc1234' },
      status: 'published',
      updated_at: sec(now, 2 * HOUR),
      provenance: {
        source: 'MIDAS/MIMES Belize 2026 — MIMES model output',
        source_url: 'https://midas.example.org/datasets/placencia-coast',
        license:
          'Shared by project collaborators for internal use; not for public redistribution.',
        citation: 'MIDAS/MIMES Belize 2026 — Placencia coast (EBIN clade detail).',
        upstream_paths: [
          'reference/MIMES_MIDAS/Processed Output/Pl_Coast_ebin_clade_detail.csv',
          'reference/MIMES_MIDAS/Polygons/PlacenciaCoast.shp',
        ],
      },
    },
    versions: [
      {
        version: 'v2026-04-25-abc1234',
        gcs_path: 'gs://midas-data/datasets/x/v2026-04-25-abc1234.geojson',
        content_hash: 'abc1234',
        content_type: 'application/geo+json',
        size_bytes: 24_512,
        feature_count: 23,
        bbox: [-88.41, 16.47, -88.32, 16.57],
        published_at: sec(now, 2 * HOUR),
        pipeline_run_id: 'run-001',
        source_file_paths: [{ path: 'raw/Pl_Coast_ebin_clade_detail.csv', hash: 'abc' }],
        schema_version: 1,
        is_current: true,
      },
      {
        version: 'v2026-04-22-def5678',
        gcs_path: 'gs://midas-data/datasets/x/v2026-04-22-def5678.geojson',
        content_hash: 'def5678',
        content_type: 'application/geo+json',
        size_bytes: 22_300,
        feature_count: 21,
        bbox: [-88.41, 16.47, -88.32, 16.57],
        published_at: sec(now, 3 * DAY),
        pipeline_run_id: 'run-pre-001',
        source_file_paths: [{ path: 'raw/Pl_Coast_ebin_clade_detail.csv', hash: 'def' }],
        schema_version: 1,
        is_current: false,
      },
      {
        version: 'v2026-04-15-9876aaa',
        gcs_path: 'gs://midas-data/datasets/x/v2026-04-15-9876aaa.geojson',
        content_hash: '9876aaa',
        content_type: 'application/geo+json',
        size_bytes: 21_900,
        feature_count: 21,
        bbox: [-88.41, 16.47, -88.32, 16.57],
        published_at: sec(now, 10 * DAY),
        pipeline_run_id: 'run-pre-002',
        source_file_paths: [{ path: 'raw/Pl_Coast_ebin_clade_detail.csv', hash: '987' }],
        schema_version: 1,
        is_current: false,
      },
    ],
  };
}

export function runDetailFixture(now = Date.now()): FakeRun {
  return {
    id: FIXTURE_IDS.run,
    triggered_by: 'drive-change',
    started_at: sec(now, 2 * HOUR),
    ended_at: sec(now, 2 * HOUR - 3 * MINUTE - 12_000),
    duration_ms: 3 * MINUTE + 12_000,
    github_run_url: 'https://github.com/example/midas_belize/actions/runs/12345678',
    status: 'partial',
    summary: defaultSummary({
      datasets_total: 8,
      datasets_published: 5,
      datasets_skipped_nochange: 1,
      datasets_blocked_by_drift: 1,
      datasets_failed: 1,
      schema_drift_opened: 1,
    }),
    dataset_outcomes: [
      mkOutcome('placencia-coast-ebin-clade-detail', 'published', {
        before: 'v2026-04-22-def5678',
        after: 'v2026-04-26-abc1234',
        durationMs: 4_200,
      }),
      mkOutcome('placencia-marine-ebin-clade-detail', 'published', {
        before: 'v2026-04-20-ccc1111',
        after: 'v2026-04-26-ddd2222',
        durationMs: 3_800,
      }),
      mkOutcome('placencia-watersheds-ebin-clade-detail', 'skipped-nochange', {
        before: 'v2026-04-22-eee3333',
        after: 'v2026-04-22-eee3333',
        durationMs: 120,
      }),
      mkOutcome('cayecaulker-coast-ebin-clade-detail', 'published', {
        before: 'v2026-04-19-fff4444',
        after: 'v2026-04-26-ggg5555',
        durationMs: 2_900,
      }),
      mkOutcome('cayecaulker-marine-ebin-clade-detail', 'failed', {
        before: 'v2026-04-19-hhh6666',
        durationMs: 850,
        reason:
          'CSV parse error: row 14 column "BIN_Label" — expected non-empty string, got null',
      }),
      mkOutcome('cayecaulker-mimes-ebin-clade-detail', 'blocked-drift', {
        before: 'v2026-04-19-iii7777',
        durationMs: 600,
        reason:
          'Schema drift opened: column "Polygon_ID" expected type integer, found type float in 12 of 24 rows',
      }),
      mkOutcome('gfw-presence-2024', 'published', {
        before: 'v2026-04-15-xyz9876',
        after: 'v2026-04-26-jjj8888',
        durationMs: 8_500,
      }),
      mkOutcome('rfactor-monthly-january', 'published', {
        before: 'v2026-04-25-aaa1111',
        after: 'v2026-04-26-bbb2222',
        durationMs: 12_400,
      }),
    ],
    drift_opened: ['drift-cayecaulker-mimes-001'],
    discovered_new: [],
  };
}

interface OutcomeOpts {
  before?: string;
  after?: string;
  durationMs: number;
  reason?: string;
}

function mkOutcome(
  datasetId: string,
  status: string,
  opts: OutcomeOpts,
): FakeRun['dataset_outcomes'][number] {
  return {
    dataset_id: datasetId,
    version_before: opts.before,
    version_after: opts.after,
    status,
    reason: opts.reason,
    duration_ms: opts.durationMs,
  };
}

export function driftDetailFixture(now = Date.now()): FakeDriftTicket {
  return driftListFixture(now)[0];
}

export interface MockOpsOptions {
  /** When set, overrides the default fixtures so a single test can swap data. */
  datasets?: FakeDataset[];
  runs?: FakeRun[];
  driftTickets?: FakeDriftTicket[];
  discoveredFiles?: FakeDiscoveredFile[];
  datasetDetail?: { dataset: FakeDataset; versions: FakeDatasetVersion[] };
  runDetail?: FakeRun;
  driftDetail?: FakeDriftTicket;
}

export async function mockAllOps(page: Page, opts: MockOpsOptions = {}) {
  const datasets = opts.datasets ?? datasetsListFixture();
  const runs = opts.runs ?? runsListFixture();
  const driftTickets = opts.driftTickets ?? driftListFixture();
  const discoveredFiles = opts.discoveredFiles ?? discoveredListFixture();
  const datasetDetail = opts.datasetDetail ?? datasetDetailFixture();
  const runDetail = opts.runDetail ?? runDetailFixture();
  const driftDetail = opts.driftDetail ?? driftDetailFixture();

  await page.route('**/api/ops/datasets', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ datasets }),
    }),
  );
  await page.route('**/api/ops/runs?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ runs }),
    }),
  );
  // Match every /api/ops/drift?status=... call regardless of status, returning
  // open tickets for `?status=open` and an empty list for any other filter.
  await page.route(/\/api\/ops\/drift\?status=/, (route) => {
    const url = route.request().url();
    const tickets = url.includes('status=open') ? driftTickets : [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ drift: tickets }),
    });
  });
  await page.route(`**/api/ops/datasets/${FIXTURE_IDS.dataset}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(datasetDetail),
    }),
  );
  await page.route(`**/api/ops/runs/${FIXTURE_IDS.run}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ run: runDetail }),
    }),
  );
  await page.route(`**/api/ops/drift/${FIXTURE_IDS.drift}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ drift: driftDetail }),
    }),
  );
  await page.route(/\/api\/ops\/discovered\?status=/, (route) => {
    const url = route.request().url();
    const files = url.includes('status=unrecognized') ? discoveredFiles : [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ discovered: files }),
    });
  });
}

export async function preloadFonts(page: Page) {
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 1rem "Funnel Sans"'),
      document.fonts.load('500 1rem "Funnel Sans"'),
      document.fonts.load('400 1rem "Funnel Display"'),
      document.fonts.load('800 1rem "Funnel Display"'),
      document.fonts.load('400 1rem "commitMono"'),
    ]);
    await document.fonts.ready;
  });
}
