import { test, expect } from '@playwright/test';

async function ready(page: import('@playwright/test').Page) {
  await page.goto('/?site=placencia');
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as any).__mapInstance);
}

test.describe('MapChrome basemap (MC-002)', () => {
  test('switching basemap preserves the viewport', async ({ page }) => {
    await ready(page);
    await page.locator('.maplibregl-canvas').focus();
    for (let i = 0; i < 5; i++) await page.keyboard.press('+');
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => (window as any).__mapDebug());
    await page.getByRole('radio', { name: 'Satellite' }).click();
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => (window as any).__mapDebug());
    // tolerance allows for the ~half-second style swap settling; viewport is
    // restored via jumpTo so deltas stay small but aren't bit-exact.
    expect(Math.abs(after.zoom - before.zoom)).toBeLessThan(0.05);
    expect(Math.abs(after.lng - before.lng)).toBeLessThan(0.001);
    expect(Math.abs(after.lat - before.lat)).toBeLessThan(0.001);
  });

  test('all four basemaps load without [map-engine] console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && m.text().includes('[map-engine]')) errors.push(m.text());
    });
    await ready(page);
    for (const name of ['Dark', 'Satellite', 'Terrain', 'Light']) {
      await page.getByRole('radio', { name }).click();
      await page.waitForTimeout(500);
      await expect(page.locator('.maplibregl-canvas')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
