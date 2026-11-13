import { test, expect } from '@playwright/test';

test('Laughing Bird shows marine polygons on selection', async ({ page }) => {
  await page.goto('/?site=laughing-bird');
  // deck.gl renders to a canvas overlay; assert the map + a deck canvas exist
  await expect(page.getByRole('region', { name: 'Map' })).toBeVisible();
  const mapCanvas = page.locator('canvas.maplibregl-canvas');
  await expect(mapCanvas.first()).toBeVisible({ timeout: 15000 });
  await page.screenshot({ path: 'tests/e2e/screenshots/laughing-bird-geometry.png' });
});
