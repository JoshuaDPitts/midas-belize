/**
 * REQ DL-049 — Consolidated dashboard visual regression.
 *
 * 7 admin/data routes × 2 themes = 14 visual baselines plus the
 * shell-level functional checks (nav order, click navigation, theme
 * toggle persistence). Each per-REQ spec keeps its functional tests
 * (status filter, sort, button assertions); the per-page visual
 * baselines live here in one snapshot directory so DL-049's accept
 * criteria — "14 baselines under data-layer-dashboard.spec.ts-snapshots/"
 * — is satisfied without duplication across files.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  FIXTURE_IDS,
  mockAllOps,
  preloadFonts,
} from './_fixtures/dashboard-fixtures';

interface RouteSpec {
  path: string;
  id: string;
  waitFor: string;
}

const ROUTES: RouteSpec[] = [
  { path: '/admin/data', id: 'datasets', waitFor: '[data-datasets-table] tbody tr' },
  { path: '/admin/data/runs', id: 'runs', waitFor: '[data-runs-list]' },
  { path: '/admin/data/drift', id: 'drift', waitFor: '[data-drift-list]' },
  {
    path: '/admin/data/discovered',
    id: 'discovered',
    waitFor: '[data-discovered-list]',
  },
  {
    path: `/admin/data/dataset/${FIXTURE_IDS.dataset}`,
    id: 'dataset-detail',
    waitFor: '[data-version-list]',
  },
  {
    path: `/admin/data/runs/${FIXTURE_IDS.run}`,
    id: 'run-detail',
    waitFor: '[data-outcomes-table]',
  },
  {
    path: `/admin/data/drift/${FIXTURE_IDS.drift}`,
    id: 'drift-detail',
    waitFor: '[data-sample-rows]',
  },
];

async function setTheme(page: Page, theme: 'light' | 'dark') {
  if (theme !== 'dark') return;
  await page.getByRole('button', { name: 'Switch to Dark' }).click();
  await page.waitForFunction(
    () => document.documentElement.getAttribute('data-theme') === 'dark',
  );
}

test.describe('REQ DL-049 — dashboard visual regression', () => {
  test.setTimeout(60_000);

  for (const route of ROUTES) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${route.path} — ${theme}`, async ({ page }) => {
        await mockAllOps(page);
        await page.goto(route.path);
        await setTheme(page, theme);
        await page.waitForSelector(route.waitFor);
        await preloadFonts(page);
        await expect(page).toHaveScreenshot(`dashboard-${route.id}-${theme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.02,
          animations: 'disabled',
        });
      });
    }
  }
});

test.describe('Dashboard shell — DL-037 functional', () => {
  test.beforeEach(async ({ page }) => {
    await mockAllOps(page);
  });

  test('sidebar nav exposes the four primary routes in spec order', async ({ page }) => {
    await page.goto('/admin/data');
    await page.waitForSelector('[data-dashboard-root]');
    const labels = await page.locator('aside nav a').allTextContents();
    expect(labels.map((l) => l.trim())).toEqual([
      'Datasets',
      'Pipeline runs',
      'Schema drift',
      'Discovered files',
    ]);
  });

  test('clicking a nav link routes to that section and reflects active state', async ({
    page,
  }) => {
    await page.goto('/admin/data');
    await page.waitForSelector('[data-dashboard-root]');
    await page.getByRole('link', { name: 'Schema drift' }).click();
    await page.waitForURL('**/admin/data/drift');
    await expect(page.getByRole('link', { name: 'Schema drift' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('theme toggle persists across navigation', async ({ page }) => {
    await page.goto('/admin/data');
    await page.getByRole('button', { name: 'Switch to Dark' }).click();
    await page.waitForFunction(
      () => document.documentElement.getAttribute('data-theme') === 'dark',
    );
    await page.getByRole('link', { name: 'Pipeline runs' }).click();
    await page.waitForURL('**/admin/data/runs');
    expect(
      await page.evaluate(() => document.documentElement.getAttribute('data-theme')),
    ).toBe('dark');
  });
});
