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

async function mockDatasetEndpoint(page: Page) {
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
      body: JSON.stringify(makeDataset()),
    }),
  );
}

test.describe('Dashboard · Rate-limit UX (DL-046)', () => {
  test.setTimeout(60_000);

  test('Rerun 429 response renders the RateLimitAlert with countdown + disables the button', async ({
    page,
  }) => {
    await mockDatasetEndpoint(page);
    await page.route(`**/api/ops/rerun/${DATASET_ID}`, (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '180' },
        body: JSON.stringify({
          error: { code: 'RATE_LIMITED', message: 'rerun quota exceeded' },
        }),
      }),
    );
    await page.goto(`/admin/data/dataset/${DATASET_ID}`);
    await page.waitForSelector('[data-page="dataset-detail"]:not([data-loading])');

    const button = page.getByRole('button', { name: /Rerun this dataset/ });
    await button.click();

    const alert = page.locator('[data-rate-limit-alert]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Rate limit reached');
    await expect(alert).toContainText('3m');

    // Button switches into the rate-limited state and is disabled.
    const rateLimitedBtn = page.getByRole('button', { name: /Rate limited/ });
    await expect(rateLimitedBtn).toBeDisabled();
    await expect(rateLimitedBtn).toHaveAttribute('data-rate-limited', 'true');
  });

  test('Rapid 11-click rerun storm shows the alert on the first 429 and prevents double-submits', async ({
    page,
  }) => {
    await mockDatasetEndpoint(page);
    let rerunCalls = 0;
    await page.route(`**/api/ops/rerun/${DATASET_ID}`, async (route) => {
      rerunCalls += 1;
      if (rerunCalls <= 10) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            run_id: `rerun-test-${rerunCalls}`,
            status: 'queued',
          }),
        });
      } else {
        await route.fulfill({
          status: 429,
          headers: { 'Retry-After': '600' },
          body: JSON.stringify({
            error: { code: 'RATE_LIMITED', message: 'quota exceeded' },
          }),
        });
      }
    });

    await page.goto(`/admin/data/dataset/${DATASET_ID}`);
    await page.waitForSelector('[data-page="dataset-detail"]:not([data-loading])');

    for (let i = 0; i < 11; i++) {
      const btn = page.locator('[data-rerun] button').first();
      const stillClickable = await btn.isEnabled();
      if (!stillClickable) break;
      await btn.click();
      await page.waitForFunction(
        () => !(document.querySelector('[data-rerun] button') as HTMLButtonElement)?.dataset.pending,
        { timeout: 5000 },
      );
    }

    await expect(page.locator('[data-rate-limit-alert]')).toBeVisible();
    await expect(page.locator('[data-rate-limit-alert]')).toContainText('10m');
    expect(rerunCalls).toBeGreaterThanOrEqual(11);
    expect(rerunCalls).toBeLessThanOrEqual(12);
  });
});
