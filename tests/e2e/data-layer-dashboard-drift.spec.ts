import { test, expect, type Page } from '@playwright/test';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

interface FakeTicket {
  id: string;
  schema_id: string;
  current_schema_version: number;
  detected_at: { _seconds: number };
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
  sample_rows: never[];
  source_file_path: string;
  status: 'open' | 'accepted' | 'rejected' | 'deferred' | 'superseded';
}

function makeFixture(): FakeTicket[] {
  const nowMs = Date.now();
  const sec = (offset: number) => Math.floor((nowMs - offset) / 1000);

  return [
    {
      id: 'drift-mimes-polygon-detail-aabbcc',
      schema_id: 'mimes-polygon-detail',
      current_schema_version: 1,
      detected_at: { _seconds: sec(2 * HOUR) },
      first_seen_in_run: 'drive-1745619600-eeff0011',
      last_seen_in_run: 'drive-1745619600-eeff0011',
      occurrence_count: 1,
      diff: {
        missing_required: ['Polygon_ID', 'BIN_Label'],
        added_unknown: ['New_Mystery_Column'],
        renamed_candidates: [
          { from: 'BIN_ID', to: 'BinId', confidence: 0.87 },
        ],
        dropped_dynamic: [],
      },
      affected_datasets: [
        'cayecaulker-mimes-ebin-clade-detail',
        'cayecaulker-mimes-nbs-scores',
      ],
      sample_rows: [],
      source_file_path:
        'reference/MIMES_MIDAS/Processed Output/Cayecaulker_mimes_ebin_clade_detail.csv',
      status: 'open',
    },
    {
      id: 'drift-rfactor-monthly-ddeeff',
      schema_id: 'rfactor-monthly',
      current_schema_version: 1,
      detected_at: { _seconds: sec(2 * DAY) },
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
      detected_at: { _seconds: sec(8 * HOUR) },
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

async function mockOps(page: Page, tickets: FakeTicket[]) {
  // Layout's FreshnessBanner pings /api/ops/datasets + /api/ops/runs via
  // usePipelineStatus on every dashboard route — return empty lists so the
  // banner stays hidden and the baseline doesn't depend on prod data.
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
  await page.route('**/api/ops/drift?status=open**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ drift: tickets }),
    }),
  );
  await page.route('**/api/ops/drift?status=accepted**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ drift: [] }),
    }),
  );
  await page.route('**/api/ops/drift?status=rejected**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ drift: [] }),
    }),
  );
}

// Visual baselines moved to tests/e2e/data-layer-dashboard.spec.ts (DL-049).

test.describe('Dashboard · Schema drift queue (DL-042)', () => {
  test.setTimeout(60_000);

  test('renders one card per ticket with [data-status]', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data/drift');
    await page.waitForSelector('[data-drift-list]');
    await expect(page.locator('[data-drift]')).toHaveCount(3);
    await expect(page.locator('[data-drift][data-status="open"]')).toHaveCount(3);
  });

  test('status filter switches to a different list (and renders empty state)', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data/drift');
    await page.waitForSelector('[data-drift-list]');
    await page.getByLabel('Filter drift tickets by status').selectOption('accepted');
    await page.waitForSelector('[data-empty-drift]');
    await expect(page.locator('[data-result-count]')).toHaveText('0 tickets');
  });

  test('Review link navigates to drift detail route', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data/drift');
    await page.waitForSelector('[data-drift-list]');
    const card = page.locator('[data-drift="drift-mimes-polygon-detail-aabbcc"]');
    await card.getByRole('link', { name: /Review/ }).click();
    await page.waitForURL('**/admin/data/drift/drift-mimes-polygon-detail-aabbcc');
  });

  test('first-seen-run link navigates to the run detail', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data/drift');
    await page.waitForSelector('[data-drift-list]');
    const link = page.getByRole('link', { name: 'drive-1745619600-eeff0011' });
    await expect(link).toHaveAttribute('href', '/admin/data/runs/drive-1745619600-eeff0011');
  });

  test('rename pairs surface confidence percentages', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data/drift');
    await page.waitForSelector('[data-drift-list]');
    await expect(page.locator('[data-diff-renames]').first()).toBeVisible();
    await expect(page.getByText('87%').first()).toBeVisible();
    await expect(page.getByText('92%').first()).toBeVisible();
  });
});
