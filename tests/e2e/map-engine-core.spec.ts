import { test, expect, type Page } from '@playwright/test';

// MC-013: residual map-engine coverage migrated from the /map showcase onto the
// real app shell (/). Selectors verified against the live NavBar/MapArea.

async function ready(page: Page, q = '/?site=placencia') {
  await page.goto(q);
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as { __mapInstance?: unknown }).__mapInstance);
}

async function pickSite(page: Page, label: string) {
  await page.getByTestId('appshell-site-trigger').click();
  await page.getByRole('option', { name: label }).click();
}

function zoom(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __mapDebug: () => { zoom: number } }).__mapDebug().zoom,
  );
}

test('ME-001: a single shared map canvas backs the app shell', async ({ page }) => {
  await ready(page);
  await expect(page.locator('[data-testid="appshell-map-area"] canvas')).toHaveCount(1);
});

test('ME-011: picking a site flies the map to a tighter zoom', async ({ page }) => {
  await ready(page, '/');
  // Normalize to the national view first so the delta is unambiguous.
  await pickSite(page, 'Belize-wide');
  await page.waitForTimeout(1800);
  const before = await zoom(page);
  await pickSite(page, 'Laughing Bird Caye');
  await page.waitForTimeout(1800);
  const after = await zoom(page);
  expect(after).toBeGreaterThan(before);
});

test('SM: ?site= and ?layers= survive a reload', async ({ page }) => {
  await ready(page, '/?site=placencia&layers=foo,bar');
  await page.reload();
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as { __mapInstance?: unknown }).__mapInstance);
  expect(page.url()).toMatch(/site=placencia/);
  expect(page.url()).toMatch(/layers=foo(?:%2C|,)bar/);
});
