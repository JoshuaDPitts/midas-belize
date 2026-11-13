import { test, expect, type Page } from '@playwright/test';

const HOUR = 3600 * 1000;
const MINUTE = 60 * 1000;
const RUN_ID = 'drive-1745619600-eeff0011';

interface FakeRun {
  id: string;
  triggered_by: 'drive-change' | 'manual-dispatch' | 'schedule' | 'dataset-rerun';
  started_at: { _seconds: number };
  ended_at?: { _seconds: number };
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

function makeFixture(): FakeRun {
  const nowMs = Date.now();
  const sec = (offset: number) => Math.floor((nowMs - offset) / 1000);
  return {
    id: RUN_ID,
    triggered_by: 'drive-change',
    started_at: { _seconds: sec(2 * HOUR) },
    ended_at: { _seconds: sec(2 * HOUR - 3 * MINUTE - 12_000) },
    duration_ms: 3 * MINUTE + 12_000,
    github_run_url: 'https://github.com/example/midas_belize/actions/runs/12345678',
    status: 'partial',
    summary: {
      datasets_total: 8,
      datasets_published: 5,
      datasets_skipped_nochange: 1,
      datasets_blocked_by_drift: 1,
      datasets_failed: 1,
      discovered_files_new: 0,
      schema_drift_opened: 1,
    },
    dataset_outcomes: [
      {
        dataset_id: 'placencia-coast-ebin-clade-detail',
        version_before: 'v2026-04-22-def5678',
        version_after: 'v2026-04-26-abc1234',
        status: 'published',
        duration_ms: 4_200,
      },
      {
        dataset_id: 'placencia-marine-ebin-clade-detail',
        version_before: 'v2026-04-20-ccc1111',
        version_after: 'v2026-04-26-ddd2222',
        status: 'published',
        duration_ms: 3_800,
      },
      {
        dataset_id: 'placencia-watersheds-ebin-clade-detail',
        version_before: 'v2026-04-22-eee3333',
        version_after: 'v2026-04-22-eee3333',
        status: 'skipped-nochange',
        duration_ms: 120,
      },
      {
        dataset_id: 'cayecaulker-coast-ebin-clade-detail',
        version_before: 'v2026-04-19-fff4444',
        version_after: 'v2026-04-26-ggg5555',
        status: 'published',
        duration_ms: 2_900,
      },
      {
        dataset_id: 'cayecaulker-marine-ebin-clade-detail',
        version_before: 'v2026-04-19-hhh6666',
        status: 'failed',
        reason: 'CSV parse error: row 14 column "BIN_Label" — expected non-empty string, got null',
        duration_ms: 850,
      },
      {
        dataset_id: 'cayecaulker-mimes-ebin-clade-detail',
        version_before: 'v2026-04-19-iii7777',
        status: 'blocked-drift',
        reason:
          'Schema drift opened: column "Polygon_ID" expected type integer, found type float in 12 of 24 rows',
        duration_ms: 600,
      },
      {
        dataset_id: 'gfw-presence-2024',
        version_before: 'v2026-04-15-xyz9876',
        version_after: 'v2026-04-26-jjj8888',
        status: 'published',
        duration_ms: 8_500,
      },
      {
        dataset_id: 'rfactor-monthly-january',
        version_before: 'v2026-04-25-aaa1111',
        version_after: 'v2026-04-26-bbb2222',
        status: 'published',
        duration_ms: 12_400,
      },
    ],
    drift_opened: ['drift-cayecaulker-mimes-001'],
    discovered_new: [],
  };
}

async function mockOps(page: Page, run: FakeRun) {
  // Stub the layout's FreshnessBanner data sources.
  await page.route('**/api/ops/datasets', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ datasets: [] }),
    }),
  );
  await page.route('**/api/ops/runs?**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ runs: [] }),
    }),
  );
  await page.route(`**/api/ops/runs/${RUN_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ run }),
    }),
  );
}

// Visual baselines moved to tests/e2e/data-layer-dashboard.spec.ts (DL-049).

test.describe('Dashboard · Pipeline run detail (DL-041)', () => {
  test.setTimeout(60_000);

  test('all 8 dataset outcomes render with status data attributes', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto(`/admin/data/runs/${RUN_ID}`);
    await page.waitForSelector('[data-outcomes-table]');
    await expect(page.locator('[data-outcome]')).toHaveCount(8);
    await expect(page.locator('[data-outcome][data-status="failed"]')).toHaveCount(1);
    await expect(page.locator('[data-outcome][data-status="blocked-drift"]')).toHaveCount(1);
    await expect(page.locator('[data-outcome][data-status="published"]')).toHaveCount(5);
    await expect(page.locator('[data-outcome][data-status="skipped-nochange"]')).toHaveCount(1);
  });

  test('failed outcome reveals reason on toggle click', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto(`/admin/data/runs/${RUN_ID}`);
    await page.waitForSelector('[data-outcomes-table]');
    const failedRow = page.locator('[data-outcome="cayecaulker-marine-ebin-clade-detail"]');
    const toggle = failedRow.getByRole('button', { name: 'Show reason' });
    await toggle.click();
    await expect(failedRow.locator('[data-reason]')).toContainText('CSV parse error');
    await failedRow.getByRole('button', { name: 'Hide reason' }).click();
    await expect(failedRow.locator('[data-reason]')).toHaveCount(0);
  });

  test('GitHub Actions link opens external runs URL', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto(`/admin/data/runs/${RUN_ID}`);
    await page.waitForSelector('[data-outcomes-table]');
    const link = page.getByRole('link', { name: /View GitHub Actions log/ });
    await expect(link).toHaveAttribute(
      'href',
      'https://github.com/example/midas_belize/actions/runs/12345678',
    );
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('back link returns to runs index', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto(`/admin/data/runs/${RUN_ID}`);
    await page.waitForSelector('[data-outcomes-table]');
    await page.getByRole('link', { name: '← All runs' }).click();
    await page.waitForURL('**/admin/data/runs');
  });

  test('KPI tiles reflect summary fields', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto(`/admin/data/runs/${RUN_ID}`);
    await page.waitForSelector('[data-kpi-row]');
    const kpis = page.locator('[data-kpi-row] article');
    await expect(kpis).toHaveCount(6);
    await expect(kpis.nth(0)).toContainText('5');
    await expect(kpis.nth(0)).toContainText('/ 8');
    await expect(kpis.nth(2)).toContainText('1');
    await expect(kpis.nth(3)).toContainText('1');
  });
});
