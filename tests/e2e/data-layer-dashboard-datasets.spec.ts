import { test, expect, type Page } from '@playwright/test';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

type FakeDataset = {
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
  updated_at: { _seconds: number };
};

function makeFixture(): FakeDataset[] {
  // Anchor offsets to the actual current time so freshness rendering
  // is stable (always "2h ago" / "3d ago" / etc.) regardless of when
  // the test executes.
  const nowMs = Date.now();
  const seconds = (offsetMs: number) => Math.floor((nowMs - offsetMs) / 1000);
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
      updated_at: { _seconds: seconds(2 * HOUR) },
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
      updated_at: { _seconds: seconds(3 * DAY) },
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
      updated_at: { _seconds: seconds(20 * DAY) },
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
      updated_at: { _seconds: seconds(30 * 60 * 1000) },
    },
  ];
}

async function mockOps(page: Page, datasets: FakeDataset[]) {
  await page.route('**/api/ops/datasets**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ datasets }),
    }),
  );
  await page.route('**/api/ops/runs**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ runs: [] }),
    }),
  );
}

// Visual baselines for this route live in tests/e2e/data-layer-dashboard.spec.ts
// (REQ DL-049 consolidation). This spec keeps only the functional tests.

test.describe('Dashboard · Datasets page (DL-038)', () => {
  test.setTimeout(60_000);

  test('status filter narrows the visible row count', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data');
    await page.waitForSelector('[data-datasets-table] tbody tr');
    const beforeCount = await page.locator('[data-datasets-table] tbody tr').count();
    expect(beforeCount).toBe(4);
    await page.getByLabel('Filter by status').selectOption('published');
    await expect(page.locator('[data-result-count]')).toHaveText('1 of 4');
    expect(await page.locator('[data-datasets-table] tbody tr').count()).toBe(1);
  });

  test('search query narrows by id, title, or tag', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data');
    await page.waitForSelector('[data-datasets-table] tbody tr');
    await page.getByLabel('Search datasets').fill('marine');
    await expect(page.locator('[data-result-count]')).toHaveText('2 of 4');
  });

  test('clicking the ID column toggles ascending/descending sort', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data');
    await page.waitForSelector('[data-datasets-table] tbody tr');
    const idHeader = page.getByRole('button', { name: /^ID/ });
    await idHeader.click();
    const ascFirst = await page.locator('[data-datasets-table] tbody tr').first().locator('td').first().textContent();
    expect(ascFirst?.trim()).toBe('gfw-presence-2024');
    await idHeader.click();
    const descFirst = await page.locator('[data-datasets-table] tbody tr').first().locator('td').first().textContent();
    expect(descFirst?.trim()).toBe('rfactor-monthly-january');
  });

  test('row id link points at the dataset detail route', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto('/admin/data');
    await page.waitForSelector('[data-datasets-table] tbody tr');
    const link = page.getByRole('link', { name: 'placencia-coast-ebin-clade-detail' });
    await expect(link).toHaveAttribute('href', '/admin/data/dataset/placencia-coast-ebin-clade-detail');
  });
});
