import { test, expect, type Page } from '@playwright/test';

const HOUR = 3600 * 1000;
const DATASET_ID = 'placencia-coast-ebin-clade-detail';

interface FakeDataset {
  id: string;
  layer: string;
  title: string;
  description: string;
  family: string;
  schema_id: string;
  schema_version: number;
  scope: 'site';
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

function makeDataset(): { dataset: FakeDataset; versions: never[] } {
  const nowMs = Date.now();
  const sec = (offset: number) => Math.floor((nowMs - offset) / 1000);
  return {
    dataset: {
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
      tags: ['marine'],
      current_version: { version: 'v2026-04-25-abc1234' },
      status: 'published',
      updated_at: { _seconds: sec(2 * HOUR) },
      provenance: {
        source: 'MIDAS test',
        source_url: null,
        license: 'internal',
        citation: 'MIDAS test',
        upstream_paths: ['raw/foo.csv'],
      },
    },
    versions: [],
  };
}

interface MockOpts {
  /** Delay before the run flips to a terminal state, in ms. */
  flipDelayMs?: number;
  finalStatus?: 'success' | 'failed' | 'partial';
  errorSummary?: string;
}

async function mockOps(page: Page, opts: MockOpts = {}) {
  const flipDelay = opts.flipDelayMs ?? 200;
  const finalStatus = opts.finalStatus ?? 'success';

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
  await page.route(`**/api/ops/datasets/${DATASET_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(makeDataset()),
    }),
  );

  await page.route(`**/api/ops/rerun/${DATASET_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ run_id: 'rerun-test-toast', status: 'queued' }),
    }),
  );

  const startedAt = Date.now();
  await page.route('**/api/ops/runs/rerun-test-toast', (route) => {
    const elapsed = Date.now() - startedAt;
    const status = elapsed < flipDelay ? 'running' : finalStatus;
    const run = {
      id: 'rerun-test-toast',
      status,
      triggered_by: 'dataset-rerun',
      started_at: { _seconds: Math.floor(startedAt / 1000) },
      duration_ms: elapsed,
      github_run_url: '',
      summary: {
        datasets_total: 1,
        datasets_published: status === 'success' ? 1 : 0,
        datasets_skipped_nochange: 0,
        datasets_blocked_by_drift: 0,
        datasets_failed: status === 'failed' ? 1 : 0,
        discovered_files_new: 0,
        schema_drift_opened: 0,
      },
      dataset_outcomes:
        status === 'success'
          ? [
              {
                dataset_id: DATASET_ID,
                version_before: 'v2026-04-25-abc1234',
                version_after: 'v2026-04-26-fff9999',
                status: 'published',
                duration_ms: elapsed,
              },
            ]
          : [],
      drift_opened: [],
      discovered_new: [],
      error_summary: status === 'failed' ? opts.errorSummary : undefined,
    };
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ run }),
    });
  });
}

test.describe('Dashboard · Rerun toast (DL-047)', () => {
  test.setTimeout(60_000);

  test('success path: rerun triggers polling, toast appears with new version + view-run link', async ({
    page,
  }) => {
    await mockOps(page, { flipDelayMs: 500, finalStatus: 'success' });
    await page.goto(`/admin/data/dataset/${DATASET_ID}`);
    await page.waitForSelector('[data-page="dataset-detail"]:not([data-loading])');
    await page.getByRole('button', { name: /Rerun this dataset/ }).click();
    const toast = page.locator('[data-toast]');
    await expect(toast).toBeVisible({ timeout: 15_000 });
    await expect(toast).toHaveAttribute('data-variant', 'success');
    await expect(toast).toContainText('Rerun completed');
    await expect(toast).toContainText('v2026-04-26-fff9999');
    const action = page.locator('[data-toast-action]');
    await expect(action).toHaveAttribute('href', '/admin/data/runs/rerun-test-toast');
  });

  test('failure path: error_summary surfaces in an error-variant toast', async ({ page }) => {
    await mockOps(page, {
      flipDelayMs: 300,
      finalStatus: 'failed',
      errorSummary: 'GHA workflow exited with status 1',
    });
    await page.goto(`/admin/data/dataset/${DATASET_ID}`);
    await page.waitForSelector('[data-page="dataset-detail"]:not([data-loading])');
    await page.getByRole('button', { name: /Rerun this dataset/ }).click();
    const toast = page.locator('[data-toast]');
    await expect(toast).toBeVisible({ timeout: 15_000 });
    await expect(toast).toHaveAttribute('data-variant', 'error');
    await expect(toast).toContainText('Rerun failed');
    await expect(toast).toContainText('GHA workflow exited with status 1');
  });

  test('toast can be manually dismissed via close button', async ({ page }) => {
    await mockOps(page, { flipDelayMs: 200, finalStatus: 'success' });
    await page.goto(`/admin/data/dataset/${DATASET_ID}`);
    await page.waitForSelector('[data-page="dataset-detail"]:not([data-loading])');
    await page.getByRole('button', { name: /Rerun this dataset/ }).click();
    const toast = page.locator('[data-toast]');
    await expect(toast).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Dismiss' }).click();
    await expect(toast).toHaveCount(0);
  });
});
