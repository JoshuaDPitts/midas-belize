import { test, expect, type Page } from '@playwright/test';

// MC-005: draw tools gated behind Inspect, deck-aware (DEC-031). The controller
// listens on MapLibre click/dblclick (not Deck's onClick), so real canvas
// clicks drive it directly. InspectTab renders the transect/area result panel
// whenever the query commits, so the draw→query→render pipeline is asserted
// deterministically regardless of whether a pick lands on a polygon.

async function ready(page: Page) {
  await page.goto('/?site=placencia&panel=inspect');
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as { __mapInstance?: unknown }).__mapInstance);
  await page.waitForSelector('[data-testid="panel-inspect"]');
  await page.waitForTimeout(800); // let the vertical's deck layers settle
}

async function clickCanvas(page: Page, x: number, y: number) {
  await page.locator('.maplibregl-canvas').click({ position: { x, y } });
}

test.describe('MapChrome draw tools (MC-005)', () => {
  test('the draw toolbar is gated on the Inspect panel', async ({ page }) => {
    await page.goto('/?site=placencia&panel=domain');
    await page.waitForSelector('.maplibregl-canvas');
    await page.waitForFunction(() => !!(window as { __mapInstance?: unknown }).__mapInstance);
    await expect(page.getByRole('button', { name: 'Transect query' })).toHaveCount(0);
  });

  // Click points sit in the open map area: right of the left Inspect panel and
  // clear of the top-right control cluster + bottom-right coordinate readout.
  test('transect tool commits and produces a profile result', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'Transect query' }).click();
    await clickCanvas(page, 760, 340);
    await clickCanvas(page, 980, 430);
    await expect(page.locator('[data-testid^="inspect-transect"]')).toBeVisible();
  });

  test('area tool commits a polygon and produces an area result', async ({ page }) => {
    await ready(page);
    await page.getByRole('button', { name: 'Area query' }).click();
    await clickCanvas(page, 720, 300);
    await clickCanvas(page, 980, 310);
    await clickCanvas(page, 950, 470);
    await page.locator('.maplibregl-canvas').dblclick({ position: { x: 740, y: 460 } });
    // The area result view renders on commit; its inner stats depend on whether
    // polygons underlie the drawn box (a data concern), so an empty box yields a
    // zero-height (hidden) container. Assert the view mounted (pipeline fired).
    await expect(page.getByTestId('inspect-area')).toBeAttached();
    await expect(page.getByTestId('inspect-empty')).toHaveCount(0);
  });

  test('Escape cancels an in-progress area draw without crashing', async ({ page }) => {
    await ready(page);
    const area = page.getByRole('button', { name: 'Area query' });
    await area.click();
    await expect(area).toHaveAttribute('data-active', 'true');
    await clickCanvas(page, 800, 360);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(area).toHaveAttribute('data-active', 'false');
    await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    await expect(page.getByTestId('panel-inspect')).toBeVisible();
  });
});
