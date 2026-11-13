import { test, expect, type Page } from '@playwright/test';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

interface FakeFile {
  id: string;
  path: string;
  ext: string;
  mime: string;
  size_bytes: number;
  first_seen: { _seconds: number };
  last_seen: { _seconds: number };
  seen_in_runs: string[];
  status: 'unrecognized' | 'pending_converter' | 'ignored';
  ignored_reason?: string;
  suggested_converter?: string;
}

function makeFixture(): { unrecognized: FakeFile[]; pending: FakeFile[]; ignored: FakeFile[] } {
  const nowMs = Date.now();
  const sec = (offset: number) => Math.floor((nowMs - offset) / 1000);
  const unrecognized: FakeFile[] = [
    {
      id: 'd1aaaaaa',
      path: 'reference/MIMES_MIDAS/Mystery/sample_2026.kml',
      ext: '.kml',
      mime: 'application/vnd.google-earth.kml+xml',
      size_bytes: 184_320,
      first_seen: { _seconds: sec(2 * HOUR) },
      last_seen: { _seconds: sec(2 * HOUR) },
      seen_in_runs: ['drive-1745619600-eeff0011'],
      status: 'unrecognized',
    },
    {
      id: 'd2bbbbbb',
      path: 'reference/MIMES_MIDAS/Mystery/wind-buoy-2024.nc',
      ext: '.nc',
      mime: 'application/x-netcdf',
      size_bytes: 24 * 1024 * 1024,
      first_seen: { _seconds: sec(8 * HOUR) },
      last_seen: { _seconds: sec(8 * HOUR) },
      seen_in_runs: ['drive-1745619600-eeff0011', 'sched-1745552500-aa3344'],
      status: 'unrecognized',
    },
    {
      id: 'd3cccccc',
      path: 'reference/MIMES_MIDAS/Misc/scratch.bin',
      ext: '.bin',
      mime: 'application/octet-stream',
      size_bytes: 512,
      first_seen: { _seconds: sec(3 * DAY) },
      last_seen: { _seconds: sec(3 * DAY) },
      seen_in_runs: ['sched-1745454300-cc1122'],
      status: 'unrecognized',
    },
  ];
  const pending: FakeFile[] = [
    {
      id: 'd4dddddd',
      path: 'reference/MIMES_MIDAS/Mystery/regions.kml',
      ext: '.kml',
      mime: 'application/vnd.google-earth.kml+xml',
      size_bytes: 96_500,
      first_seen: { _seconds: sec(2 * DAY) },
      last_seen: { _seconds: sec(HOUR) },
      seen_in_runs: ['drive-1745619600-eeff0011'],
      status: 'pending_converter',
      suggested_converter: 'kml',
    },
  ];
  const ignored: FakeFile[] = [
    {
      id: 'd5eeeeee',
      path: 'reference/MIMES_MIDAS/.DS_Store',
      ext: '',
      mime: 'application/octet-stream',
      size_bytes: 6_148,
      first_seen: { _seconds: sec(5 * DAY) },
      last_seen: { _seconds: sec(2 * DAY) },
      seen_in_runs: ['sched-1745454300-cc1122'],
      status: 'ignored',
      ignored_reason: 'macOS Finder metadata noise',
    },
  ];
  return { unrecognized, pending, ignored };
}

async function mockOps(page: Page) {
  const { unrecognized, pending, ignored } = makeFixture();
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
  await page.route('**/api/ops/discovered?status=unrecognized**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ discovered: unrecognized }),
    }),
  );
  await page.route('**/api/ops/discovered?status=pending_converter**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ discovered: pending }),
    }),
  );
  await page.route('**/api/ops/discovered?status=ignored**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ discovered: ignored }),
    }),
  );
}

// Visual baselines moved to tests/e2e/data-layer-dashboard.spec.ts (DL-049).

test.describe('Dashboard · Discovered files (DL-044)', () => {
  test.setTimeout(60_000);

  test('renders 3 unrecognized cards by default', async ({ page }) => {
    await mockOps(page);
    await page.goto('/admin/data/discovered');
    await page.waitForSelector('[data-discovered-list]');
    await expect(page.locator('[data-discovered]')).toHaveCount(3);
    await expect(page.locator('[data-result-count]')).toHaveText('3 files');
  });

  test('status filter switches to pending_converter and shows the suggestion', async ({
    page,
  }) => {
    await mockOps(page);
    await page.goto('/admin/data/discovered');
    await page.waitForSelector('[data-discovered-list]');
    await page
      .getByLabel('Filter discovered files by status')
      .selectOption('pending_converter');
    await page.waitForSelector('[data-suggestion]');
    await expect(page.locator('[data-discovered]')).toHaveCount(1);
    await expect(page.locator('[data-suggestion]')).toContainText('kml');
  });

  test('status filter switches to ignored and shows the reason', async ({ page }) => {
    await mockOps(page);
    await page.goto('/admin/data/discovered');
    await page.waitForSelector('[data-discovered-list]');
    await page.getByLabel('Filter discovered files by status').selectOption('ignored');
    await page.waitForSelector('[data-ignored-reason]');
    await expect(page.locator('[data-ignored-reason]')).toContainText('macOS Finder');
  });

  test('Suggest-converter form: enter id → POST /classify with action=suggest-converter', async ({
    page,
  }) => {
    await mockOps(page);
    let lastBody: { action?: string; suggested_converter?: string } | null = null;
    await page.route('**/api/ops/discovered/d1aaaaaa/classify', async (route) => {
      lastBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.goto('/admin/data/discovered');
    await page.waitForSelector('[data-discovered-list]');
    const card = page.locator('[data-discovered="d1aaaaaa"]');
    await card.locator('[data-action="open-suggest"]').click();
    await card.locator('[data-converter-input]').fill('kml');
    await card.locator('[data-action="confirm-suggest"]').click();
    await expect(card.locator('[data-form="suggest"]')).toHaveCount(0);
    expect(lastBody!.action).toBe('suggest-converter');
    expect(lastBody!.suggested_converter).toBe('kml');
  });

  test('Ignore form: type reason → POST /classify with action=ignore + reason', async ({
    page,
  }) => {
    await mockOps(page);
    let lastBody: { action?: string; reason?: string } | null = null;
    await page.route('**/api/ops/discovered/d3cccccc/classify', async (route) => {
      lastBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true }),
      });
    });
    await page.goto('/admin/data/discovered');
    await page.waitForSelector('[data-discovered-list]');
    const card = page.locator('[data-discovered="d3cccccc"]');
    await card.locator('[data-action="open-ignore"]').click();
    await card.getByPlaceholder(/Why ignore this file/).fill('temp scratch — not data');
    await card.locator('[data-action="confirm-ignore"]').click();
    await expect(card.locator('[data-form="ignore"]')).toHaveCount(0);
    expect(lastBody!.action).toBe('ignore');
    expect(lastBody!.reason).toBe('temp scratch — not data');
  });
});
