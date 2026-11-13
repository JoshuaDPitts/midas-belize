import { test, expect, type Page } from '@playwright/test';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const DATASET_ID = 'placencia-coast-ebin-clade-detail';

interface FakeVersion {
  version: string;
  gcs_path: string;
  content_hash: string;
  content_type: string;
  size_bytes: number;
  feature_count: number;
  bbox: [number, number, number, number];
  published_at: { _seconds: number };
  pipeline_run_id: string;
  source_file_paths: Array<{ path: string; hash: string }>;
  schema_version: number;
  is_current: boolean;
}

interface FakeDataset {
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
  current_version: { version: string };
  status: string;
  updated_at: { _seconds: number };
  provenance: {
    source: string;
    source_url: string | null;
    license: string;
    citation: string;
    upstream_paths: string[];
  };
}

function makeFixture(): { dataset: FakeDataset; versions: FakeVersion[] } {
  const nowMs = Date.now();
  const sec = (offset: number) => Math.floor((nowMs - offset) / 1000);

  const dataset: FakeDataset = {
    id: DATASET_ID,
    layer: DATASET_ID,
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
    updated_at: { _seconds: sec(2 * HOUR) },
    provenance: {
      source: 'MIDAS/MIMES Belize 2026 — MIMES model output',
      source_url: 'https://midas.example.org/datasets/placencia-coast',
      license: 'Shared by project collaborators for internal use; not for public redistribution.',
      citation: 'MIDAS/MIMES Belize 2026 — Placencia coast (EBIN clade detail).',
      upstream_paths: [
        'reference/MIMES_MIDAS/Processed Output/Pl_Coast_ebin_clade_detail.csv',
        'reference/MIMES_MIDAS/Polygons/PlacenciaCoast.shp',
      ],
    },
  };

  const versions: FakeVersion[] = [
    {
      version: 'v2026-04-25-abc1234',
      gcs_path: `gs://midas-data/datasets/${DATASET_ID}/v2026-04-25-abc1234.geojson`,
      content_hash: 'abc1234',
      content_type: 'application/geo+json',
      size_bytes: 24_512,
      feature_count: 23,
      bbox: [-88.41, 16.47, -88.32, 16.57],
      published_at: { _seconds: sec(2 * HOUR) },
      pipeline_run_id: 'run-001',
      source_file_paths: [{ path: 'raw/Pl_Coast_ebin_clade_detail.csv', hash: 'abc' }],
      schema_version: 1,
      is_current: true,
    },
    {
      version: 'v2026-04-22-def5678',
      gcs_path: `gs://midas-data/datasets/${DATASET_ID}/v2026-04-22-def5678.geojson`,
      content_hash: 'def5678',
      content_type: 'application/geo+json',
      size_bytes: 22_300,
      feature_count: 21,
      bbox: [-88.41, 16.47, -88.32, 16.57],
      published_at: { _seconds: sec(3 * DAY) },
      pipeline_run_id: 'run-pre-001',
      source_file_paths: [{ path: 'raw/Pl_Coast_ebin_clade_detail.csv', hash: 'def' }],
      schema_version: 1,
      is_current: false,
    },
    {
      version: 'v2026-04-15-9876aaa',
      gcs_path: `gs://midas-data/datasets/${DATASET_ID}/v2026-04-15-9876aaa.geojson`,
      content_hash: '9876aaa',
      content_type: 'application/geo+json',
      size_bytes: 21_900,
      feature_count: 21,
      bbox: [-88.41, 16.47, -88.32, 16.57],
      published_at: { _seconds: sec(10 * DAY) },
      pipeline_run_id: 'run-pre-002',
      source_file_paths: [{ path: 'raw/Pl_Coast_ebin_clade_detail.csv', hash: '987' }],
      schema_version: 1,
      is_current: false,
    },
  ];

  return { dataset, versions };
}

async function mockOps(
  page: Page,
  override?: Partial<{ dataset: FakeDataset; versions: FakeVersion[] }>,
) {
  const { dataset, versions } = makeFixture();
  const datasetBody = override?.dataset ?? dataset;
  const versionsBody = override?.versions ?? versions;
  // Stub the layout's FreshnessBanner data sources.
  await page.route('**/api/ops/datasets', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ datasets: [] }),
    }),
  );
  await page.route('**/api/ops/runs**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ runs: [] }),
    }),
  );
  await page.route(`**/api/ops/datasets/${DATASET_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ dataset: datasetBody, versions: versionsBody }),
    }),
  );
}

// Visual baselines moved to tests/e2e/data-layer-dashboard.spec.ts (DL-049).

test.describe('Dashboard · Dataset detail (DL-039)', () => {
  test.setTimeout(60_000);

  test('clicking the back link returns to the datasets index', async ({ page }) => {
    await mockOps(page);
    await page.goto(`/admin/data/dataset/${DATASET_ID}`);
    await page.waitForSelector('[data-page="dataset-detail"]:not([data-loading])');
    await page.getByRole('link', { name: '← All datasets' }).click();
    await page.waitForURL('**/admin/data');
    await expect(page).toHaveURL(/\/admin\/data$/);
  });

  test('rerun button POSTs and renders the triggered-run notice', async ({ page }) => {
    await mockOps(page);
    await page.route(`**/api/ops/rerun/${DATASET_ID}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          run_id: 'rerun-test-1234',
          github_run_url: null,
          status: 'queued',
        }),
      }),
    );
    await page.goto(`/admin/data/dataset/${DATASET_ID}`);
    await page.waitForSelector('[data-page="dataset-detail"]:not([data-loading])');
    await page.getByRole('button', { name: /Rerun this dataset/ }).click();
    await page.waitForSelector('[data-rerun-notice]');
    const link = page.getByRole('link', { name: 'rerun-test-1234' });
    await expect(link).toHaveAttribute('href', '/admin/data/runs/rerun-test-1234');
  });

  test('rerun button shows rate-limit notice on HTTP 429', async ({ page }) => {
    await mockOps(page);
    await page.route(`**/api/ops/rerun/${DATASET_ID}`, (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '180' },
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'rate limited' } }),
      }),
    );
    await page.goto(`/admin/data/dataset/${DATASET_ID}`);
    await page.waitForSelector('[data-page="dataset-detail"]:not([data-loading])');
    await page.getByRole('button', { name: /Rerun this dataset/ }).click();
    const alert = page.locator('[data-rate-limit-alert]');
    await expect(alert).toContainText('Rate limit reached');
    await expect(alert).toContainText('3m');
  });

  test('current version row is visually marked', async ({ page }) => {
    await mockOps(page);
    await page.goto(`/admin/data/dataset/${DATASET_ID}`);
    await page.waitForSelector('[data-version-list]');
    const currentRows = page.locator('[data-current]');
    await expect(currentRows).toHaveCount(1);
    await expect(currentRows.first()).toHaveAttribute('data-version', 'v2026-04-25-abc1234');
  });
});
