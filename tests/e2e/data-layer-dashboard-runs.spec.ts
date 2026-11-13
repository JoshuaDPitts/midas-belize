import { test, expect, type Page } from '@playwright/test';

const HOUR = 3600 * 1000;
const MINUTE = 60 * 1000;

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
  dataset_outcomes: never[];
  drift_opened: string[];
  discovered_new: string[];
  error_summary?: string;
}

function makeFixture(): FakeRun[] {
  const nowMs = Date.now();
  const sec = (offset: number) => Math.floor((nowMs - offset) / 1000);

  return [
    {
      id: 'rerun-1745623200-aabbccdd',
      triggered_by: 'dataset-rerun',
      started_at: { _seconds: sec(15 * MINUTE) },
      ended_at: { _seconds: sec(15 * MINUTE - 28_000) },
      duration_ms: 28_000,
      github_run_url: '',
      status: 'success',
      summary: {
        datasets_total: 1,
        datasets_published: 1,
        datasets_skipped_nochange: 0,
        datasets_blocked_by_drift: 0,
        datasets_failed: 0,
        discovered_files_new: 0,
        schema_drift_opened: 0,
      },
      dataset_outcomes: [],
      drift_opened: [],
      discovered_new: [],
    },
    {
      id: 'drive-1745619600-eeff0011',
      triggered_by: 'drive-change',
      started_at: { _seconds: sec(2 * HOUR) },
      ended_at: { _seconds: sec(2 * HOUR - 3 * MINUTE - 12_000) },
      duration_ms: 3 * MINUTE + 12_000,
      github_run_url: '',
      status: 'partial',
      summary: {
        datasets_total: 8,
        datasets_published: 6,
        datasets_skipped_nochange: 0,
        datasets_blocked_by_drift: 1,
        datasets_failed: 1,
        discovered_files_new: 0,
        schema_drift_opened: 1,
      },
      dataset_outcomes: [],
      drift_opened: ['drift-001'],
      discovered_new: [],
    },
    {
      id: 'sched-1745609000-2233aabb',
      triggered_by: 'schedule',
      started_at: { _seconds: sec(5 * HOUR) },
      ended_at: { _seconds: sec(5 * HOUR - 90_000) },
      duration_ms: 90_000,
      github_run_url: '',
      status: 'success',
      summary: {
        datasets_total: 12,
        datasets_published: 12,
        datasets_skipped_nochange: 0,
        datasets_blocked_by_drift: 0,
        datasets_failed: 0,
        discovered_files_new: 2,
        schema_drift_opened: 0,
      },
      dataset_outcomes: [],
      drift_opened: [],
      discovered_new: ['file-1', 'file-2'],
    },
    {
      id: 'manual-1745595500-ccdd44ee',
      triggered_by: 'manual-dispatch',
      started_at: { _seconds: sec(8 * HOUR) },
      ended_at: { _seconds: sec(8 * HOUR - 4 * MINUTE - 2_000) },
      duration_ms: 4 * MINUTE + 2_000,
      github_run_url: '',
      status: 'failed',
      summary: {
        datasets_total: 5,
        datasets_published: 0,
        datasets_skipped_nochange: 0,
        datasets_blocked_by_drift: 0,
        datasets_failed: 5,
        discovered_files_new: 0,
        schema_drift_opened: 0,
      },
      dataset_outcomes: [],
      drift_opened: [],
      discovered_new: [],
      error_summary: 'GHA workflow exited with status 1',
    },
    {
      id: 'sched-1745552500-99887766',
      triggered_by: 'schedule',
      started_at: { _seconds: sec(20 * HOUR) },
      ended_at: { _seconds: sec(20 * HOUR - 75_000) },
      duration_ms: 75_000,
      github_run_url: '',
      status: 'success',
      summary: {
        datasets_total: 12,
        datasets_published: 12,
        datasets_skipped_nochange: 0,
        datasets_blocked_by_drift: 0,
        datasets_failed: 0,
        discovered_files_new: 0,
        schema_drift_opened: 0,
      },
      dataset_outcomes: [],
      drift_opened: [],
      discovered_new: [],
    },
  ];
}

async function mockOps(page: Page, runs: FakeRun[]) {
  await page.route('**/api/ops/runs**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ runs }),
    }),
  );
  await page.route('**/api/ops/datasets**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ datasets: [] }),
    }),
  );
}

// Visual baselines moved to tests/e2e/data-layer-dashboard.spec.ts (DL-049).

test.describe('Dashboard · Pipeline runs (DL-040)', () => {
  test.setTimeout(60_000);

  test('status filter narrows the visible row count', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data/runs');
    await page.waitForSelector('[data-runs-list]');
    expect(await page.locator('[data-run]').count()).toBe(5);
    await page.getByLabel('Filter runs by status').selectOption('failed');
    await expect(page.locator('[data-result-count]')).toHaveText('1 of 5');
  });

  test('clicking a run id navigates to detail route', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data/runs');
    await page.waitForSelector('[data-runs-list]');
    await page
      .locator('[data-run="rerun-1745623200-aabbccdd"]')
      .getByRole('link')
      .click();
    await page.waitForURL('**/admin/data/runs/rerun-1745623200-aabbccdd');
  });

  test('KPI row reflects success-rate and failed-count', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data/runs');
    await page.waitForSelector('[data-kpi-row]');
    const kpiBlocks = page.locator('[data-kpi-row] article');
    await expect(kpiBlocks).toHaveCount(4);
    // 5 runs total, 3 success / 1 partial / 1 failed → settled = 5 → 3/5 = 60%.
    await expect(kpiBlocks.nth(0)).toContainText('5');
    await expect(kpiBlocks.nth(1)).toContainText('60');
    await expect(kpiBlocks.nth(2)).toContainText('1');
  });

  test('duration trend chart renders one point per run with duration_ms', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data/runs');
    await page.waitForSelector('[data-trend-chart]');
    const circles = await page.locator('[data-trend-chart] circle').count();
    expect(circles).toBe(5);
  });
});
